import { Plugin } from 'siyuan';
import FriendshipPanel from './components/friendshipPanel';
import FriendManager from './friendManager';
import InteractionLogger from './interactionLogger';
import ReminderManager from './reminderManager';
import AnalyticsManager from './analyticsManager';
import i18n from './i18n';

export default class FriendshipRecorderPlugin extends Plugin {
  friendManager: FriendManager;
  interactionLogger: InteractionLogger;
  reminderManager: ReminderManager;
  analyticsManager: AnalyticsManager;
  panel: FriendshipPanel;
  i18n: Record<string, Record<string, string>>;

  async onload() {
    // 初始化国际化
    this.i18n = i18n;
    
    // 初始化核心模块
    this.friendManager = new FriendManager(this);
    this.interactionLogger = new InteractionLogger(this);
    this.reminderManager = new ReminderManager(this);
    this.analyticsManager = new AnalyticsManager(this);
    
    await Promise.all([
      this.friendManager.init(),
      this.interactionLogger.init(),
      this.reminderManager.init(),
      this.analyticsManager.init()
    ]);

    // 注册侧边栏面板
    this.panel = new FriendshipPanel(this);
    this.addSidebar({
      icon: 'icon-users',
      title: this.i18n[this.lang].friendManagement,
      position: 'right',
      content: this.panel.render(),
      width: 400
    });

    // 注册命令
    this.registerCommand({
      command: 'friendship-recorder:show-panel',
      name: this.i18n[this.lang].showPanel,
      callback: () => this.panel.show()
    });

    // 加载样式
    this.loadStyle('styles/style.css');
  }

  onunload() {
    console.log('Friendship Recorder plugin unloaded');
  }

  // 获取当前语言
  get lang(): string {
    return window.siyuan.config.lang || 'zh_CN';
  }
}