import { useState, useEffect } from 'react';
import { Container, Card, Group, Text, Button, Badge, Stack, Select, Modal, ActionIcon, Grid, Accordion, LoadingOverlay, Image } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconFolderSymlink } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';
import { usePathContext } from '../contexts';

interface ChartInfo {
  name: string;
  category: string;
  has_bg: boolean;
  has_track: boolean;
  has_maidata: boolean;
  has_video: boolean;
}

// 单独的图片组件，用于处理 jpg/png 回退
function ChartImage({ path, hasBg, alt }: { path: string; hasBg: boolean; alt: string }) {
  const [imgSrc, setImgSrc] = useState(convertFileSrc(`${path}\\bg.jpg`));
  const [imgError, setImgError] = useState(false);

  const handleError = () => {
    if (imgSrc.includes('bg.jpg')) {
      setImgSrc(convertFileSrc(`${path}\\bg.png`));
    } else {
      setImgError(true);
    }
  };

  return (
    <Image
      src={hasBg && !imgError ? imgSrc : undefined}
      height={100}
      alt={alt}
      onError={handleError}
      fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23ddd'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E"
    />
  );
}

interface LocalChartsProps {
  onRefresh?: () => void;
}

export function LocalCharts({ onRefresh }: LocalChartsProps) {
  const { defaultGameFolderPath } = usePathContext();
  const [categories, setCategories] = useState<string[]>([]);
  const [chartsByCategory, setChartsByCategory] = useState<Record<string, ChartInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [chartToMove, setChartToMove] = useState<ChartInfo | null>(null);
  const [targetCategory, setTargetCategory] = useState<string | null>(null);

  useEffect(() => {
    loadCharts();
  }, [defaultGameFolderPath]);

  const loadCharts = async () => {
    if (!defaultGameFolderPath) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const maichartsPath = `${defaultGameFolderPath}\\MaiCharts`;
      
      // 加载所有分类
      const cats = await invoke<string[]>('list_chart_categories', { maichartsDir: maichartsPath });
      setCategories(cats);

      // 加载每个分类的谱面
      const chartData: Record<string, ChartInfo[]> = {};
      for (const category of cats) {
        const charts = await invoke<ChartInfo[]>('list_charts_in_category', { 
          maichartsDir: maichartsPath,
          category 
        });
        chartData[category] = charts;
      }
      setChartsByCategory(chartData);
    } catch (error) {
      console.error('加载谱面失败:', error);
      notifications.show({
        title: '错误',
        message: '加载谱面失败: ' + String(error),
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChart = async (chart: ChartInfo) => {
    if (!defaultGameFolderPath) return;

    const confirmed = await ask(`确定要删除谱面 "${chart.name}" 吗？此操作不可恢复！`, {
      title: '确认删除',
      kind: 'warning',
    });
    if (!confirmed) return;

    try {
      const maichartsPath = `${defaultGameFolderPath}\\MaiCharts`;
      await invoke('delete_chart', {
        maichartsDir: maichartsPath,
        category: chart.category,
        chartName: chart.name,
      });

      notifications.show({
        title: '成功',
        message: '谱面已删除',
        color: 'green',
      });

      setChartsByCategory(prev => ({
        ...prev,
        [chart.category]: prev[chart.category].filter(c => c.name !== chart.name)
      }));
      onRefresh?.();
    } catch (error) {
      console.error('删除谱面失败:', error);
      notifications.show({
        title: '错误',
        message: '删除谱面失败: ' + String(error),
        color: 'red',
      });
    }
  };

  const handleMoveChart = async () => {
    if (!defaultGameFolderPath || !chartToMove || !targetCategory) return;

    try {
      const maichartsPath = `${defaultGameFolderPath}\\MaiCharts`;
      await invoke('move_chart', {
        maichartsDir: maichartsPath,
        fromCategory: chartToMove.category,
        toCategory: targetCategory,
        chartName: chartToMove.name,
      });

      notifications.show({
        title: '成功',
        message: '谱面已移动',
        color: 'green',
      });

      // 只更新本地状态，不重新加载以保持 Accordion 展开状态
      setChartsByCategory(prev => {
        const updatedChart = { ...chartToMove!, category: targetCategory };
        return {
          ...prev,
          [chartToMove!.category]: prev[chartToMove!.category].filter(c => c.name !== chartToMove!.name),
          [targetCategory]: [...(prev[targetCategory] || []), updatedChart]
        };
      });

      setMoveModalOpen(false);
      setChartToMove(null);
      setTargetCategory(null);
      onRefresh?.();
    } catch (error) {
      console.error('移动谱面失败:', error);
      notifications.show({
        title: '错误',
        message: '移动谱面失败: ' + String(error),
        color: 'red',
      });
    }
  };

  const openMoveModal = (chart: ChartInfo) => {
    setChartToMove(chart);
    setTargetCategory(null);
    setMoveModalOpen(true);
  };

  if (loading) {
    return (
      <Container size="xl" py="xl" style={{ position: 'relative', minHeight: 400 }}>
        <LoadingOverlay visible={true} />
      </Container>
    );
  }

  if (categories.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Text c="dimmed">暂无谱面，请先下载谱面或确保 MaiCharts 目录存在</Text>
      </Container>
    );
  }

  return (
    <>
      <Container size="xl" py="md">
        <Stack gap="md">
          <Group justify="space-between">
            <Text size="lg" fw={600}>本地谱面</Text>
            <Button onClick={loadCharts} variant="light">刷新</Button>
          </Group>

          <Accordion multiple>
            {categories.map(category => (
              <Accordion.Item key={category} value={category}>
                <Accordion.Control>
                  <Group>
                    <Text fw={500}>{category}</Text>
                    <Badge>{chartsByCategory[category]?.length || 0} 个谱面</Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Grid gutter="sm">
                    {chartsByCategory[category]?.map(chart => {
                      const chartPath = `${defaultGameFolderPath}\\MaiCharts\\${category}\\${chart.name}`;
                      
                      return (
                        <Grid.Col key={chart.name} span={{ base: 12, sm: 6, md: 3, lg: 2.4 }}>
                          <Card shadow="sm" padding="sm" radius="md" withBorder>
                            <Card.Section>
                              <ChartImage path={chartPath} hasBg={chart.has_bg} alt={chart.name} />
                            </Card.Section>

                            <Stack gap="xs" mt="sm">
                              <Text fw={500} size="xs" lineClamp={1}>
                                {chart.name}
                              </Text>

                              <Group gap={4}>
                                <ActionIcon
                                  size="sm"
                                  color="blue"
                                  variant="light"
                                  onClick={() => openMoveModal(chart)}
                                  title="移动到其他分类"
                                  style={{ flex: 1 }}
                                >
                                  <IconFolderSymlink size={16} />
                                </ActionIcon>
                                <ActionIcon
                                  size="sm"
                                  color="red"
                                  variant="light"
                                  onClick={() => handleDeleteChart(chart)}
                                  title="删除谱面"
                                  style={{ flex: 1 }}
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Group>
                            </Stack>
                          </Card>
                        </Grid.Col>
                      );
                    })}
                  </Grid>
                  {chartsByCategory[category]?.length === 0 && (
                    <Text c="dimmed" ta="center" py="xl">
                      该分类下暂无谱面
                    </Text>
                  )}
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </Stack>
      </Container>

      <Modal
        opened={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        title="移动谱面"
      >
        <Stack gap="md">
          <Text size="sm">
            将谱面 <Text span fw={600}>{chartToMove?.name}</Text> 从 <Text span c="blue">{chartToMove?.category}</Text> 移动到：
          </Text>
          <Select
            label="目标分类"
            placeholder="选择目标分类"
            data={categories.filter(c => c !== chartToMove?.category)}
            value={targetCategory}
            onChange={setTargetCategory}
            searchable
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setMoveModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleMoveChart} disabled={!targetCategory}>
              移动
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
