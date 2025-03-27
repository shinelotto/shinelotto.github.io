class TrendChart {
  constructor(container) {
    this.container = container;
    this.rowsPerPage = 20;
    this.currentZone = 1;
    this.init();
  }

  async init() {
    this.data = await this.loadData();
    this.render();
    this.setupEvents();
  }

  async loadData() {
    const response = await fetch('data/ssqhistory.csv');
    const text = await response.text();
    return text.split('\n').filter(row => row.trim()).map(row => {
      const [id, ...balls] = row.split(',');
      return { id, balls: balls.map(Number) };
    });
  }

  render() {
    // 生成图表网格
    let html = `<div class="trend-grid">`;
    
    // 添加表头
    html += `<div class="header-row">...</div>`;
    
    // 添加数据行
    this.getCurrentPageData().forEach(item => {
      html += this.renderRow(item);
    });
    
    html += `</div>`;
    this.container.innerHTML = html;
  }

  renderRow(item) {
    return `
      <div class="data-row">
        <div class="cell period">${item.id}</div>
        ${this.renderBalls(item.balls)}
      </div>
    `;
  }

  renderBalls(balls) {
    let html = '';
    for(let i=1; i<=33; i++) {
      const isMarked = balls.includes(i);
      html += `<div class="cell num-cell ${isMarked ? 'marked' : ''}">${isMarked ? '●' : ''}</div>`;
    }
    return html;
  }

  setupEvents() {
    // 区域筛选事件
    document.getElementById('zone-select').addEventListener('change', (e) => {
      this.currentZone = e.target.value;
      this.render();
    });
  }
}

new TrendChart(document.getElementById('trend-chart-container'));