// 独立的快速记录弹窗，尚未与主面板联动
export class QuickRecordDialog {
    private plugin: any;

    constructor(plugin: any) {
        this.plugin = plugin;
    }

    open() {
        // 渲染并插入 DOM，事件绑定留给调用方处理
        const dialog = document.createElement('div');
        dialog.className = 'quick-record-dialog';
        dialog.innerHTML = this.render();
        document.body.appendChild(dialog);
    }

    render(): string {
        // 使用模板字符串定义基础表单结构
        return `
        <div class="dialog-mask">
          <div class="dialog-content">
            <h3>快速记录互动</h3>
            <form id="quick-record-form">
              <div class="form-group">
                <label>朋友</label>
                <select name="friendId" required>
                  <option value="">选择朋友</option>
                  <!-- 朋友选项将通过JS动态加载 -->
                </select>
              </div>
              <div class="form-group">
                <label>互动类型</label>
                <select name="type" required>
                  <option value="meeting">见面</option>
                  <option value="chat">聊天</option>
                  <option value="activity">活动</option>
                  <option value="gift">礼物</option>
                  <option value="call">通话</option>
                  <option value="meal">聚餐</option>
                  <option value="travel">旅行</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div class="form-group">
                <label>日期</label>
                <input type="date" name="date" value="${new Date().toISOString().split('T')[0]}" />
              </div>
              <div class="form-group">
                <label>内容</label>
                <textarea name="content" rows="3" required></textarea>
              </div>
              <div class="form-actions">
                <button type="button" class="cancel-btn">取消</button>
                <button type="submit" class="submit-btn">保存</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }
}