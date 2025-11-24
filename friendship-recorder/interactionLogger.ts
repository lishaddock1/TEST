// 负责在 /Interactions/ 目录下记录并查询互动信息
class InteractionLogger {
    constructor() {
        // 按朋友 ID 划分目录，方便 SQL 查询
        this.interactionsPath = '/Interactions/';
    }

    async init() {
        // 初始化互动记录系统
    }

    async logInteraction(interactionData) {
        // 创建一条互动记录文档，并同步更新朋友最近联系时间
        const interactionId = this.generateInteractionId();
        const docPath = `${this.interactionsPath}${interactionId}.sy`;

        const content = this.generateInteractionDocument(interactionData);

        try {
            const result = await this.createDocument(docPath, content);
            await this.setInteractionAttributes(result.id, interactionData);

            // 更新朋友的最后联系时间
            if (interactionData.friendId) {
                await this.updateLastContactDate(interactionData.friendId, interactionData.date);
            }

            return {
                id: result.id,
                ...interactionData,
                created: new Date().toISOString()
            };

        } catch (error) {
            console.error('Failed to log interaction:', error);
            throw error;
        }
    }

    async getFriendInteractions(friendId, options = {}) {
        // 支持分页和互动类型过滤
        const { limit = 50, offset = 0, type } = options;

        let sql = `
            SELECT * FROM blocks 
            WHERE path LIKE '${this.interactionsPath}%' 
            AND attr ->> 'friend-id' = '${friendId}'
        `;

        if (type) {
            sql += ` AND attr ->> 'interaction-type' = '${type}'`;
        }

        sql += ` ORDER BY attr ->> 'interaction-date' DESC LIMIT ${limit} OFFSET ${offset}`;

        return await this.querySQL(sql);
    }

    async getInteractionStats(friendId, period = 'month') {
        // 使用 SQL 聚合统计某段时间内的互动类型与平均心情
        const startDate = this.getPeriodStartDate(period);

        const sql = `
            SELECT 
                attr ->> 'interaction-type' as type,
                COUNT(*) as count,
                AVG(CAST(attr ->> 'interaction-mood' AS NUMERIC)) as avg_mood
            FROM blocks 
            WHERE path LIKE '${this.interactionsPath}%' 
            AND attr ->> 'friend-id' = '${friendId}'
            AND attr ->> 'interaction-date' >= '${startDate}'
            GROUP BY attr ->> 'interaction-type'
        `;

        return await this.querySQL(sql);
    }

    generateInteractionDocument(interactionData) {
        // 生成互动记录主体内容，方便用户后期补充细节
        const date = new Date(interactionData.date).toLocaleDateString('zh-CN');

        return `# ${interactionData.title || '互动记录'}

interaction-type: ${interactionData.type}
interaction-date: ${interactionData.date}
interaction-mood: ${interactionData.mood || 3}
interaction-location: ${interactionData.location || ''}
interaction-cost: ${interactionData.cost || 0}
friend-id: ${interactionData.friendId}
tags: ${JSON.stringify(interactionData.tags || [])}

## 互动详情

**日期**: ${date}
**类型**: ${this.getInteractionTypeLabel(interactionData.type)}
**心情**: ${'😊'.repeat(interactionData.mood || 3)}${'😐'.repeat(5 - (interactionData.mood || 3))}
**地点**: ${interactionData.location || ''}

${interactionData.content || ''}
`;
    }

    async setInteractionAttributes(blockId, interactionData) {
        // 将互动元数据写入块属性，便于 SQL 检索
        const attributes = {
            'interaction-id': blockId,
            'interaction-type': interactionData.type,
            'interaction-date': interactionData.date,
            'interaction-mood': interactionData.mood || 3,
            'interaction-location': interactionData.location || '',
            'interaction-cost': interactionData.cost || 0,
            'friend-id': interactionData.friendId,
            'interaction-tags': JSON.stringify(interactionData.tags || [])
        };

        await this.setBlockAttrs(blockId, attributes);
    }

    getInteractionTypeLabel(type) {
        // 简单的中文映射，未来可对接 i18n
        const typeLabels = {
            'meeting': '见面',
            'chat': '聊天',
            'activity': '活动',
            'gift': '礼物',
            'call': '通话',
            'meal': '聚餐',
            'travel': '旅行',
            'other': '其他'
        };

        return typeLabels[type] || type;
    }

    generateInteractionId() {
        // 通过时间戳 + 随机串保证 ID 唯一
        return `interaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    getPeriodStartDate(period) {
        // 计算统计区间的起始时间
        const now = new Date();
        switch (period) {
            case 'week':
                return new Date(now.setDate(now.getDate() - 7)).toISOString();
            case 'month':
                return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
            case 'year':
                return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
            default:
                return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
        }
    }

    async updateLastContactDate(friendId, date) {
        // 更新朋友的最后联系时间
        await this.setBlockAttrs(friendId, {
            'friend-last-contact': date
        });
    }

    // API封装方法
    async querySQL(sql) {
        return await (window as any).siyuan.querySQL(sql);
    }

    async createDocument(path, content) {
        return await (window as any).siyuan.createDocument(path, content);
    }

    async setBlockAttrs(blockId, attrs) {
        return await (window as any).siyuan.setBlockAttrs(blockId, attrs);
    }
}