import * as echarts from 'echarts';

class AnalyticsManager {
  private plugin: any;

  constructor(plugin: any) {
    this.plugin = plugin;
  }

  async init() {
    // 初始化数据分析模块
  }

  /**
   * 获取整体统计数据
   */
  async getOverallStats(period: 'week' | 'month' | 'year' = 'month') {
    const startDate = this.getPeriodStartDate(period);

    // 互动统计
    const interactionsSql = `
      SELECT 
        SUBSTR(attr ->> 'interaction-date', 1, 10) as date,
        attr ->> 'interaction-type' as type,
        COUNT(*) as count
      FROM blocks 
      WHERE path LIKE '/Interactions/%'
      AND attr ->> 'interaction-date' >= '${startDate}'
      GROUP BY date, type
      ORDER BY date
    `;

    // 朋友统计
    const friendsSql = `
      SELECT COUNT(*) as total FROM blocks 
      WHERE path LIKE '/Friends/%'
    `;

    const [interactions, friends] = await Promise.all([
      this.querySQL(interactionsSql),
      this.querySQL(friendsSql)
    ]);

    return {
      interactions: interactions || [],
      friendCount: friends[0]?.total || 0
    };
  }

  /**
   * 渲染互动统计图表
   */
  renderInteractionChart(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const chart = echarts.init(container);
    
    // 这里使用示例数据，实际应从getOverallStats获取
    const option = {
      title: {
        text: this.plugin.i18n[this.plugin.lang].analytics,
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: [
          this.plugin.i18n[this.plugin.lang].meeting,
          this.plugin.i18n[this.plugin.lang].chat,
          this.plugin.i18n[this.plugin.lang].meal,
          this.plugin.i18n[this.plugin.lang].other
        ],
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value' },
      series: []
    };

    chart.setOption(option);
    return chart;
  }

  /**
   * 计算统计周期的起始日期
   */
  private getPeriodStartDate(period: 'week' | 'month' | 'year') {
    const now = new Date();
    switch (period) {
      case 'week':
        now.setDate(now.getDate() - 7);
        break;
      case 'month':
        now.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        now.setFullYear(now.getFullYear() - 1);
        break;
    }
    return now.toISOString().split('T')[0];
  }

  // API封装
  private async querySQL(sql: string) {
    return await window.siyuan.querySQL(sql);
  }
}

export default AnalyticsManager;