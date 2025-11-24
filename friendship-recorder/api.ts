// 对思源内核 HTTP 接口的简单封装，便于统一错误处理
export class SiYuanAPI {
    private plugin: any;

    constructor(plugin: any) {
        this.plugin = plugin;
    }

    async createDoc(params: { notebook: string; path: string; markdown: string }): Promise<string> {
        // POST /api/filetree/createDoc，用于创建文档
        // 使用思源API创建文档
        const response = await fetch('/api/filetree/createDoc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });
        const result = await response.json();
        return result.data;
    }

    async setBlockAttrs(blockId: string, attrs: Record<string, string>) {
        // POST /api/attr/setBlockAttrs，批量更新块属性
        await fetch('/api/attr/setBlockAttrs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: blockId,
                attrs,
            }),
        });
    }

    async querySql(sql: string): Promise<any> {
        // POST /api/query/sql，执行 SQL 语句并返回数据
        const response = await fetch('/api/query/sql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ stmt: sql }),
        });
        const result = await response.json();
        return result.data;
    }
}