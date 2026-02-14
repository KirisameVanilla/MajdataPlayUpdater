import { useState, useEffect } from 'react';
import { Container, TextInput, Select, Card, Group, Text, Button, Badge, Stack, Grid, Modal, LoadingOverlay, Pagination, Image, Divider, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconSearch, IconPlus } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
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
    setDownloadModalOpen(true);
  };

  const downloadChart = async () => {
    if (!selectedChart || !defaultGameFolderPath) return;

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

      const chartFolder = await join(maichartsPath, finalCategory, selectedChart.title);

      // 创建谱面文件夹
      await invoke('create_directory', { path: chartFolder });

      // 下载文件
      const files = [
        { url: `${API_ROOT}/maichart/${selectedChart.id}/track`, name: 'track.mp3' },
        { url: `${API_ROOT}/maichart/${selectedChart.id}/image?fullImage=true`, name: 'bg.jpg' },
        { url: `${API_ROOT}/maichart/${selectedChart.id}/chart`, name: 'maidata.txt' },
      ];

      for (const file of files) {
        try {
          await invoke('download_file_to_path', {
            url: file.url,
            filePath: file.name,
            targetDir: chartFolder,
            proxy: null,
          });
        } catch (error) {
          console.error(`下载 ${file.name} 失败:`, error);
        }
      }

      // 尝试下载视频（可选）
      try {
        await invoke('download_file_to_path', {
          url: `${API_ROOT}/maichart/${selectedChart.id}/video`,
          filePath: 'pv.mp4',
          targetDir: chartFolder,
          proxy: null,
        });
      } catch (error) {
        // 视频是可选的，忽略错误
        console.log('视频不存在或下载失败（正常现象）');
      }

      notifications.show({
        title: '成功',
        message: `谱面 "${selectedChart.title}" 已下载到 ${finalCategory} 分类`,
        color: 'green',
      });

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

          {loading ? (
            <div style={{ position: 'relative', minHeight: 400 }}>
              <LoadingOverlay visible={true} />
            </div>
          ) : (
            <>
              <Grid gutter="md">
                {charts.map((chart) => (
                  <Grid.Col key={chart.id} span={{ base: 12, sm: 6, md: 4 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                      <Card.Section>
                        <Image
                          src={`${API_ROOT}/maichart/${chart.id}/image`}
                          height={160}
                          alt={chart.title}
                          fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23ddd'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E"
                        />
                      </Card.Section>

                      <Stack gap="xs" mt="md">
                        <Text fw={500} size="sm" lineClamp={2}>
                          {chart.title}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {chart.artist}
                        </Text>
                        <Group gap="xs">
                          <Text size="xs" c="dimmed">
                            谱师: {chart.designer}
                          </Text>
                        </Group>
                        <Group gap="xs">
                          {chart.levels && chart.levels.map((level, idx) => (
                            level && level.trim() !== '' ? (
                              <Badge key={idx} size="xs" variant="dot">
                                {level}
                              </Badge>
                            ) : null
                          ))}
                        </Group>

                        <Button
                          fullWidth
                          mt="xs"
                          leftSection={<IconDownload size={16} />}
                          onClick={() => openDownloadModal(chart)}
                        >
                          下载
                        </Button>
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
        title="下载谱面"
      >
        <Stack gap="md">
          <Text size="sm">
            下载谱面: <Text span fw={600}>{selectedChart?.title}</Text>
          </Text>
          
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
