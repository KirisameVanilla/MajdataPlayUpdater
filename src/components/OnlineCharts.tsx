import { useState, useEffect } from 'react';
import { Container, TextInput, Select, Card, Group, Text, Button, Badge, Stack, Grid, Modal, LoadingOverlay, Pagination, Image, Divider, Loader, Checkbox, ScrollArea, Progress } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconSearch, IconPlus, IconCheckbox, IconSquare, IconRefresh } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { usePathContext } from '../contexts';

const API_ROOT = 'https://majdata.net/api3/api';

interface ChartSummary {
  id: string;
  title: string;
  artist: string;
  designer: string;
  uploader: string;
  levels: (string | null)[];  // API 返回数组，可能包含 null、空字符串或 "14", "13+" 等
}

interface OnlineChartsProps {
  onRefresh?: () => void;
}

export function OnlineCharts({ onRefresh }: OnlineChartsProps) {
  const { defaultGameFolderPath } = usePathContext();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortType, setSortType] = useState(0);
  const [charts, setCharts] = useState<ChartSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [selectedChart, setSelectedChart] = useState<ChartSummary | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [targetCategory, setTargetCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [selectedChartIds, setSelectedChartIds] = useState<Set<string>>(new Set());
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

  const ITEMS_PER_PAGE = 30;

  const sortOptions = [
    { value: '0', label: '上传日期' },
    { value: '1', label: '点赞数' },
    { value: '2', label: '评论数' },
    { value: '3', label: '播放数' },
  ];

  useEffect(() => {
    loadCategories();
  }, [defaultGameFolderPath]);

  // 监听下载进度事件
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<{ current: number; total: number; chart_title: string }>('download-progress', (event) => {
      setDownloadProgress({
        current: event.payload.current,
        total: event.payload.total,
      });
    }).then((unlistenFn) => {
      unlisten = unlistenFn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // 搜索防抖：延迟 500ms 后更新 debouncedSearch
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0); // 搜索内容变化时重置页码
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // 当防抖后的搜索词、排序或页码变化时执行搜索
  useEffect(() => {
    searchCharts();
  }, [debouncedSearch, sortType, page]);

  const loadCategories = async () => {
    if (!defaultGameFolderPath) return;

    try {
      const maichartsPath = `${defaultGameFolderPath}\\MaiCharts`;
      const cats = await invoke<string[]>('list_chart_categories', { maichartsDir: maichartsPath });
      setCategories(cats);
      if (cats.length > 0) {
        setTargetCategory(cats[0]);
      }
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  };

  const searchCharts = async () => {
    setLoading(true);
    try {
      const charts = await invoke<ChartSummary[]>('fetch_chart_list', {
        search: debouncedSearch,
        sortType,
        page,
        proxy: null,
      });
      
      if (Array.isArray(charts)) {
        setCharts(charts);
        if (charts.length < ITEMS_PER_PAGE) {
          setTotalPages(page + 1);
        } else if (totalPages === page + 1) {
          setTotalPages(page + 2);
        }
      } else {
        setCharts([]);
      }
    } catch (error) {
      console.error('搜索谱面失败:', error);
      notifications.show({
        title: '错误',
        message: '搜索谱面失败: ' + String(error),
        color: 'red',
      });
      setCharts([]);
    } finally {
      setLoading(false);
    }
  };

  const openDownloadModal = (chart: ChartSummary) => {
    setSelectedChart(chart);
    setTargetCategory(null);
    setNewCategoryName('');
    setDownloadProgress({ current: 0, total: 0 });
    setDownloadModalOpen(true);
  };

  const openBatchDownloadModal = () => {
    if (selectedChartIds.size === 0) {
      notifications.show({
        title: '提示',
        message: '请先选择要下载的谱面',
        color: 'yellow',
      });
      return;
    }
    setSelectedChart(null);
    setTargetCategory(null);
    setNewCategoryName('');
    setDownloadProgress({ current: 0, total: 0 });
    setDownloadModalOpen(true);
  };

  const toggleSelectChart = (chartId: string) => {
    setSelectedChartIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chartId)) {
        newSet.delete(chartId);
      } else {
        newSet.add(chartId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedChartIds.size === charts.length) {
      setSelectedChartIds(new Set());
    } else {
      setSelectedChartIds(new Set(charts.map(c => c.id)));
    }
  };

  const toggleBatchMode = () => {
    setIsBatchMode(!isBatchMode);
    if (isBatchMode) {
      setSelectedChartIds(new Set());
    }
  };

  const clearCacheAndRefresh = async () => {
    try {
      await invoke('clear_api_cache');
      notifications.show({
        title: '缓存已清除',
        message: '正在重新加载谱面列表…',
        color: 'blue',
      });
      await searchCharts();
    } catch (error) {
      console.error('清除缓存失败:', error);
      notifications.show({
        title: '错误',
        message: '清除缓存失败: ' + String(error),
        color: 'red',
      });
    }
  };

  const downloadSingleChart = async (chart: ChartSummary, finalCategory: string, maichartsPath: string) => {
    // 调用Rust端批量下载命令（单个谱面）
    await invoke('download_charts_batch', {
      chartIds: [chart.id],
      chartTitles: [chart.title],
      maichartsDir: maichartsPath,
      category: finalCategory,
      proxy: null,
    });
  };

  const downloadChart = async () => {
    if (!defaultGameFolderPath) return;

    // 确定目标分类
    const finalCategory = targetCategory || newCategoryName.trim();
    if (!finalCategory) {
      notifications.show({
        title: '错误',
        message: '请选择或输入分类名称',
        color: 'red',
      });
      return;
    }

    setDownloading(true);
    try {
      const maichartsPath = `${defaultGameFolderPath}\\MaiCharts`;

      // 如果是新分类，先创建
      if (newCategoryName && !categories.includes(finalCategory)) {
        await invoke('create_chart_category', {
          maichartsDir: maichartsPath,
          category: finalCategory,
        });
        setCategories([...categories, finalCategory]);
      }

      // 批量下载
      if (!selectedChart) {
        const chartsToDownload = charts.filter(c => selectedChartIds.has(c.id));
        setDownloadProgress({ current: 0, total: chartsToDownload.length });

        // 调用Rust端批量下载命令
        await invoke('download_charts_batch', {
          chartIds: chartsToDownload.map(c => c.id),
          chartTitles: chartsToDownload.map(c => c.title),
          maichartsDir: maichartsPath,
          category: finalCategory,
          proxy: null,
        });

        notifications.show({
          title: '成功',
          message: `已成功下载 ${chartsToDownload.length} 个谱面到 ${finalCategory} 分类`,
          color: 'green',
        });

        setSelectedChartIds(new Set());
        setIsBatchMode(false);
      } else {
        // 单个下载
        await downloadSingleChart(selectedChart, finalCategory, maichartsPath);

        notifications.show({
          title: '成功',
          message: `谱面 "${selectedChart.title}" 已下载到 ${finalCategory} 分类`,
          color: 'green',
        });
      }

      setDownloadModalOpen(false);
      onRefresh?.();
    } catch (error) {
      console.error('下载谱面失败:', error);
      notifications.show({
        title: '错误',
        message: '下载谱面失败: ' + String(error),
        color: 'red',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Container size="xl" py="md">
        <Stack gap="md">
          <Group>
            <TextInput
              placeholder="搜索谱面..."
              leftSection={<IconSearch size={16} />}
              rightSection={search !== debouncedSearch ? <Loader size="xs" /> : null}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <Select
              data={sortOptions}
              value={String(sortType)}
              onChange={(val) => setSortType(Number(val))}
              style={{ width: 150 }}
            />
          </Group>

          {!loading && charts.length > 0 && (
            <Group justify="space-between">
              <Group>
                <Button
                  variant={isBatchMode ? "filled" : "light"}
                  leftSection={isBatchMode ? <IconCheckbox size={16} /> : <IconSquare size={16} />}
                  onClick={toggleBatchMode}
                >
                  {isBatchMode ? '退出批量模式' : '批量选择'}
                </Button>
                <Button
                  variant="light"
                  color="gray"
                  leftSection={<IconRefresh size={16} />}
                  onClick={clearCacheAndRefresh}
                >
                  清除缓存
                </Button>
                {isBatchMode && (
                  <>
                    <Button
                      variant="light"
                      onClick={toggleSelectAll}
                    >
                      {selectedChartIds.size === charts.length ? '取消全选' : '全选'}
                    </Button>
                    <Badge size="lg">{selectedChartIds.size} / {charts.length} 已选</Badge>
                  </>
                )}
              </Group>
              {isBatchMode && selectedChartIds.size > 0 && (
                <Button
                  leftSection={<IconDownload size={16} />}
                  onClick={openBatchDownloadModal}
                >
                  批量下载 ({selectedChartIds.size})
                </Button>
              )}
            </Group>
          )}

          {loading ? (
            <div style={{ position: 'relative', minHeight: 400 }}>
              <LoadingOverlay visible={true} />
            </div>
          ) : (
            <>
              <Grid gutter="sm">
                {charts.map((chart) => (
                  <Grid.Col key={chart.id} span={{ base: 12, sm: 6, md: 3, lg: 2.4 }}>
                    <Card
                      shadow="sm"
                      padding="sm"
                      radius="md"
                      withBorder
                      style={{
                        cursor: isBatchMode ? 'pointer' : 'default',
                        backgroundColor: selectedChartIds.has(chart.id) ? 'var(--mantine-color-blue-light)' : undefined,
                      }}
                      onClick={() => isBatchMode && toggleSelectChart(chart.id)}
                    >
                      {isBatchMode && (
                        <Checkbox
                          checked={selectedChartIds.has(chart.id)}
                          onChange={() => toggleSelectChart(chart.id)}
                          style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <Card.Section>
                        <Image
                          src={`${API_ROOT}/maichart/${chart.id}/image`}
                          height={100}
                          alt={chart.title}
                          fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23ddd'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E"
                        />
                      </Card.Section>

                      <Stack gap="xs" mt="sm">
                        <Text fw={500} size="xs" lineClamp={1}>
                          {chart.title}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {chart.artist}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          谱师: {chart.designer}
                        </Text>
                        <Group gap={4}>
                          {chart.levels && chart.levels.map((level, idx) => (
                            level && level.trim() !== '' ? (
                              <Badge key={idx} size="xs" variant="dot">
                                {level}
                              </Badge>
                            ) : null
                          ))}
                        </Group>

                        {!isBatchMode && (
                          <Button
                            fullWidth
                            mt="xs"
                            size="xs"
                            leftSection={<IconDownload size={14} />}
                            onClick={() => openDownloadModal(chart)}
                          >
                            下载
                          </Button>
                        )}
                      </Stack>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>

              {charts.length === 0 && !loading && (
                <Text c="dimmed" ta="center" py="xl">
                  没有找到谱面
                </Text>
              )}

              {charts.length > 0 && (
                <Group justify="center" mt="xl">
                  <Pagination
                    value={page + 1}
                    onChange={(p) => setPage(p - 1)}
                    total={totalPages}
                  />
                </Group>
              )}
            </>
          )}
        </Stack>
      </Container>

      <Modal
        opened={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        title={selectedChart ? "下载谱面" : "批量下载谱面"}
        size={selectedChart ? "md" : "lg"}
      >
        <Stack gap="md">
          {selectedChart ? (
            <Text size="sm">
              下载谱面: <Text span fw={600}>{selectedChart.title}</Text>
            </Text>
          ) : (
            <>
              <Text size="sm">
                将下载 <Text span fw={600} c="blue">{selectedChartIds.size}</Text> 个谱面
              </Text>
              <ScrollArea h={200} type="auto">
                <Stack gap="xs">
                  {charts.filter(c => selectedChartIds.has(c.id)).map(chart => (
                    <Card key={chart.id} padding="xs" withBorder>
                      <Group gap="xs">
                        <div style={{ flex: 1 }}>
                          <Text size="xs" fw={500} lineClamp={1}>{chart.title}</Text>
                          <Text size="xs" c="dimmed" lineClamp={1}>{chart.artist}</Text>
                        </div>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </ScrollArea>
            </>
          )}
          
          {downloading && downloadProgress.total > 0 && (
            <div>
              <Text size="sm" mb="xs">
                下载进度: {downloadProgress.current} / {downloadProgress.total}
              </Text>
              <Progress
                value={(downloadProgress.current / downloadProgress.total) * 100}
                animated
              />
            </div>
          )}
          
          <Select
            label="选择已有分类"
            placeholder="选择分类"
            data={categories}
            value={targetCategory}
            onChange={(value) => {
              setTargetCategory(value);
              setNewCategoryName('');
            }}
            searchable
            clearable
          />
          
          <Divider label="或" labelPosition="center" />
          
          <TextInput
            label="创建新分类"
            placeholder="输入新分类名称"
            value={newCategoryName}
            onChange={(e) => {
              setNewCategoryName(e.target.value);
              setTargetCategory(null);
            }}
            leftSection={<IconPlus size={16} />}
          />
          
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setDownloadModalOpen(false)}>
              取消
            </Button>
            <Button
              onClick={downloadChart}
              disabled={(!targetCategory && !newCategoryName.trim()) || downloading}
              loading={downloading}
            >
              下载
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
