class ReminderManager {
    private plugin: any;
    private remindersPath = '/Reminders/';
  
    constructor(plugin: any) {
      this.plugin = plugin;
    }
  
    async init() {
      // 初始化时检查是否有到期提醒
      await this.checkDueReminders();
      // 每天检查一次提醒
      setInterval(() => this.checkDueReminders(), 86400000);
    }
  
    /**
     * 设置新提醒
     * @param friendId 朋友ID
     * @param date 提醒日期 (YYYY-MM-DD)
     * @param message 提醒内容
     */
    async setReminder(friendId: string, date: string, message: string) {
      const reminderId = `reminder-${Date.now()}`;
      const docPath = `${this.remindersPath}${reminderId}.sy`;
  
      // 获取朋友名称
      const friend = await this.plugin.friendManager.getFriendById(friendId);
      const friendName = friend?.name || '未知朋友';
  
      // 创建提醒文档
      const content = `# 提醒：联系 ${friendName}
  
  - 日期：${date}
  - 朋友：${friendName}
  - 内容：${message}
  
  - [ ] 已完成
  `;
  
      const result = await this.createDocument(docPath, content);
      
      // 设置提醒属性
      await this.setBlockAttrs(result.id, {
        'reminder-type': 'friend',
        'friend-id': friendId,
        'reminder-date': date,
        'reminder-status': 'pending'
      });
  
      return {
        id: result.id,
        friendId,
        date,
        message,
        status: 'pending'
      };
    }
  
    /**
     * 检查到期提醒
     */
    async checkDueReminders() {
      const today = new Date().toISOString().split('T')[0];
      const sql = `
        SELECT b.id, b.content, b.attr 
        FROM blocks b
        WHERE b.path LIKE '${this.remindersPath}%' 
        AND b.attr ->> 'reminder-status' = 'pending'
        AND b.attr ->> 'reminder-date' <= '${today}'
      `;
  
      const reminders = await this.querySQL(sql);
      if (reminders.length > 0) {
        this.showReminderNotification(reminders);
      }
    }
  
    /**
     * 显示提醒通知
     */
    private showReminderNotification(reminders: any[]) {
      const count = reminders.length;
      this.plugin.showMessage(
        `${this.plugin.i18n[this.plugin.lang].upcomingReminders}: ${count}个`,
        10000
      );
      
      // 可以在这里实现更详细的通知展示逻辑
    }
  
    // API封装
    private async querySQL(sql: string) {
      return await window.siyuan.querySQL(sql);
    }
  
    private async createDocument(path: string, content: string) {
      return await window.siyuan.createDocument(path, content);
    }
  
    private async setBlockAttrs(blockId: string, attrs: Record<string, any>) {
      return await window.siyuan.setBlockAttrs(blockId, attrs);
    }
  }
  
  export default ReminderManager;