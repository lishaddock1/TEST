/**
 * 朋友关系记录插件主类
 * 负责协调各子模块并响应思源笔记的生命周期
 */
class FriendshipPlugin {
    // 国际化文本映射
    private i18n: Record<string, string>;
    // 朋友管理模块
    private friendManager: FriendManager;
    // 互动记录模块
    private interactionLogger: InteractionLogger;
    // 提醒系统模块
    private reminderSystem: ReminderSystem;
    // 数据分析面板
    private analyticsDashboard: AnalyticsDashboard | null = null;
    // 侧边栏面板
    private panel?: FriendshipPanel;

    /**
     * 构造函数，初始化各模块
     */
    constructor() {
        // 预初始化依赖模块，方便在 onload 中直接使用
        this.i18n = {};
        this.friendManager = new FriendManager();
        this.interactionLogger = new InteractionLogger();
        this.reminderSystem = new ReminderSystem();
        log('FriendshipPlugin constructor initialized');
    }

    /**
     * 插件加载时调用的方法
     * 完成资源加载与 UI 渲染
     */
    async onload() {
        log('FriendshipPlugin onload started');
        try {
            // 加载国际化资源
            await this.loadI18n();
            log('i18n loaded for language:', (window as any).siyuan?.config?.lang);

            // 添加侧边栏图标
            this.addIcon();
            log('Sidebar icon added');

            // 初始化朋友管理模块
            await this.friendManager.init();
            log('FriendManager initialized');

            // 初始化互动记录模块
            await this.interactionLogger.init();
            log('InteractionLogger initialized');

            // 初始化提醒系统
            await this.reminderSystem.init();
            log('ReminderSystem initialized');

            // 创建侧边栏面板
            this.createPanel();
            log('Sidebar panel created');

            // 注册快捷键命令
            this.registerCommands();
            log('Commands registered');

            log('FriendshipPlugin onload completed successfully');
        } catch (error) {
            log('Error during onload:', error);
            throw error;
        }
    }

    /**
     * 插件卸载时调用的方法
     * 清理资源
     */
    onunload() {
        log('FriendshipPlugin onunload started');
        
        // 销毁面板
        this.destroyPanel();
        log('Panel destroyed');
        
        // 销毁提醒系统定时器
        this.reminderSystem.destroy();
        log('ReminderSystem destroyed');
        
        // 销毁数据分析面板
        if (this.analyticsDashboard) {
            this.analyticsDashboard.destroy();
            this.analyticsDashboard = null;
        }
        
        log('FriendshipPlugin onunload completed');
    }

    /**
     * 加载国际化资源
     */
    private async loadI18n() {
        // i18n 文件保存在 /plugins/friendship-recorder/i18n 下，按当前语言优先加载
        const lang = (window as any).siyuan?.config?.lang ?? 'zh_CN';
        log(`Loading i18n resources for language: ${lang}`);
        
        try {
            const response = await fetch(`/plugins/friendship-recorder/i18n/${lang}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.i18n = await response.json();
            log('i18n resources loaded successfully');
        } catch (error) {
            log('Failed to load i18n resources, using fallback:', error);
            //  fallback 文本
            this.i18n = {
                friendManagement: '朋友管理',
                addFriend: '添加朋友',
                searchFriends: '搜索朋友...',
                quickRecord: '快速记录',
                upcomingReminders: '即将提醒',
                analytics: '数据分析',
                name: '姓名',
                relationship: '关系',
                birthday: '生日',
                contact: '联系方式'
            };
        }
    }

    /**
     * 添加侧边栏图标
     */
    private addIcon() {
        log('Adding sidebar icon');
        // 定义图标SVG
        const iconSvg = `<svg viewBox="0 0 32 32">
            <path d="M16 0c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16zM16 30c-7.732 0-14-6.268-14-14s6.268-14 14-14 14 6.268 14 14-6.268 14-14 14zM22 10c0-3.314-2.686-6-6-6s-6 2.686-6 6 2.686 6 6 6 6-2.686 6-6zM10 10c0-2.209 1.791-4 4-4s4 1.791 4 4-1.791 4-4 4-4-1.791-4-4zM26 28c0-1.105-0.895-2-2-2h-16c-1.105 0-2 0.895-2 2v2h20v-2zM8 26h16c0.552 0 1 0.448 1 1v1h-18v-1c0-0.552 0.448-1 1-1z"/>
        </svg>`;
        
        // 调用思源API添加图标
        if ((window as any).siyuan?.addIcon) {
            (window as any).siyuan.addIcon('friendship-recorder', iconSvg);
        } else {
            log('Warning: siyuan.addIcon API not available');
        }
        log('Sidebar icon added');
    }

    /**
     * 创建侧边栏面板
     */
    private createPanel() {
        log('Creating sidebar panel');
        this.panel = new FriendshipPanel(this);
        this.panel.create();
        log('Sidebar panel created');
    }

    /**
     * 销毁侧边栏面板
     */
    private destroyPanel() {
        // 避免重复销毁，在判空后释放 DOM
        if (!this.panel) {
            log('Panel already destroyed, skipping');
            return;
        }
        log('Destroying sidebar panel');
        this.panel.destroy();
        this.panel = undefined;
        log('Sidebar panel destroyed');
    }

    /**
     * 注册快捷键命令
     */
    private registerCommands() {
        log('Registering commands');
        // 定义命令数组
        const commands = [
            {
                langKey: 'quickRecord',
                langText: this.i18n.quickRecord ?? '快速记录',
                hotkey: 'Ctrl+Shift+R',
                callback: () => {
                    log('Quick record command triggered');
                    this.panel?.showQuickRecord();
                }
            },
            {
                langKey: 'addFriend',
                langText: this.i18n.addFriend ?? '添加朋友',
                hotkey: 'Ctrl+Shift+F',
                callback: () => {
                    log('Add friend command triggered');
                    this.panel?.showAddFriend();
                }
            }
        ];

        // 注册每个命令
        commands.forEach(cmd => {
            if ((window as any).siyuan?.addCommand) {
                (window as any).siyuan.addCommand({
                    name: cmd.langKey,
                    label: cmd.langText,
                    hotkey: cmd.hotkey,
                    callback: cmd.callback
                });
                log(`Command registered: ${cmd.langKey}`);
            } else {
                log(`Warning: siyuan.addCommand API not available for ${cmd.langKey}`);
            }
        });
        log('Commands registration completed');
    }

    /**
     * 显示数据分析面板
     */
    showAnalytics() {
        if (!this.analyticsDashboard) {
            this.analyticsDashboard = new AnalyticsDashboard(this);
        }
        
        // 创建面板容器
        const container = document.createElement('div');
        container.className = 'analytics-container';
        document.body.appendChild(container);
        
        // 初始化并显示数据分析面板
        this.analyticsDashboard.init(container);
    }
}

// 插件初始化
const friendshipPlugin = new FriendshipPlugin();

// 导出插件供思源笔记加载
export default friendshipPlugin;