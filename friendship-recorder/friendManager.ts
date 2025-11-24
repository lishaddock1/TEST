/**
 * 朋友管理模块
 * 负责管理 /Friends/ 目录下的所有朋友信息，提供CRUD与查询能力
 */
class FriendManager {
  // 内存缓存，存储朋友信息
  private friends: Map<string, any>;
  // 朋友文档存储路径
  private friendsPath: string;

  /**
   * 构造函数
   */
  constructor() {
      // 使用Map做内存缓存，减少重复SQL查询
      this.friends = new Map();
      this.friendsPath = '/Friends/';
      log('FriendManager initialized');
  }

  /**
   * 初始化朋友管理模块
   */
  async init() {
      log('Initializing FriendManager');
      await this.loadFriends();
      log(`Loaded ${this.friends.size} friends into cache`);
  }

  /**
   * 从数据库加载所有朋友信息到缓存
   */
  async loadFriends() {
      log('Loading friends from database');
      try {
          // 使用思源API查询所有朋友文档
          const sql = `SELECT * FROM blocks WHERE path LIKE '${this.friendsPath}%' AND type = 'd'`;
          const result = await this.querySQL(sql);
          log(`Found ${result.length} friend documents`);

          // 解析每个朋友文档
          for (const block of result) {
              const friend = await this.parseFriendFromBlock(block);
              if (friend) {
                  this.friends.set(friend.id, friend);
              }
          }
          
          log(`Successfully loaded ${this.friends.size} friends`);
      } catch (error) {
          console.error('Failed to load friends:', error);
          throw error;
      }
  }

  /**
   * 创建新的朋友记录
   * @param friendData 朋友信息数据
   * @returns 创建的朋友对象
   */
  async createFriend(friendData: any) {
      log(`Creating new friend: ${friendData.name}`);
      
      // 生成朋友ID和文档路径
      const friendId = await this.generateFriendId(friendData.name);
      const docPath = `${this.friendsPath}${friendData.name}.sy`;

      // 生成朋友文档内容
      const docContent = this.generateFriendDocument(friendData);

      try {
          // 使用思源API创建文档
          const result = await this.createDocument(docPath, docContent);
          log(`Document created for ${friendData.name} with ID: ${result.id}`);

          // 设置文档属性
          await this.setFriendAttributes(result.id, friendData);

          // 创建朋友对象并添加到缓存
          const friend = {
              id: result.id,
              ...friendData,
              created: new Date().toISOString()
          };

          this.friends.set(friend.id, friend);
          log(`Friend ${friendData.name} created successfully`);
          return friend;

      } catch (error) {
          console.error('Failed to create friend:', error);
          throw error;
      }
  }

  /**
   * 更新朋友信息
   * @param friendId 朋友ID
   * @param updates 要更新的字段
   * @returns 更新后的朋友对象
   */
  async updateFriend(friendId: string, updates: any) {
      log(`Updating friend with ID: ${friendId}`);
      
      // 检查朋友是否存在
      const friend = this.friends.get(friendId);
      if (!friend) {
          const error = new Error(`Friend with ID ${friendId} not found`);
          log(error.message);
          throw error;
      }

      // 更新文档属性
      await this.setFriendAttributes(friendId, updates);

      // 更新内存中的数据
      Object.assign(friend, updates);
      friend.updated = new Date().toISOString();

      log(`Friend ${friend.name} updated successfully`);
      return friend;
  }

  /**
   * 搜索朋友
   * @param query 搜索关键词
   * @param filters 过滤条件
   * @returns 符合条件的朋友列表
   */
  async searchFriends(query: string = '', filters: any = {}) {
      log(`Searching friends with query: "${query}" and filters:`, filters);
      
      // 从缓存中获取所有朋友
      let results = Array.from(this.friends.values());

      // 文本搜索
      if (query) {
          const lowerQuery = query.toLowerCase();
          results = results.filter(friend =>
              friend.name.toLowerCase().includes(lowerQuery) ||
              (friend.nickname && friend.nickname.toLowerCase().includes(lowerQuery)) ||
              (friend.tags && friend.tags.some((tag: string) => tag.toLowerCase().includes(lowerQuery)))
          );
      }

      // 关系类型过滤
      if (filters.relationship) {
          results = results.filter(friend => friend.relationship === filters.relationship);
      }

      // 标签过滤
      if (filters.tags && filters.tags.length > 0) {
          results = results.filter(friend =>
              friend.tags && filters.tags.every((tag: string) => friend.tags.includes(tag))
          );
      }

      log(`Search returned ${results.length} friends`);
      return results;
  }

  /**
   * 获取指定朋友的互动记录
   * @param friendId 朋友ID
   * @param limit 记录数量限制
   * @returns 互动记录列表
   */
  async getFriendInteractions(friendId: string, limit: number = 50) {
      log(`Fetching interactions for friend ID: ${friendId}, limit: ${limit}`);
      
      const sql = `
          SELECT * FROM blocks 
          WHERE path LIKE '/Interactions/%' 
          AND attr ->> 'friend-id' = '${friendId}'
          ORDER BY created DESC 
          LIMIT ${limit}
      `;

      const interactions = await this.querySQL(sql);
      log(`Found ${interactions.length} interactions for friend ID: ${friendId}`);
      return interactions;
  }

  /**
   * 生成朋友文档的Markdown内容
   * @param friendData 朋友信息数据
   * @returns Markdown格式的文档内容
   */
  generateFriendDocument(friendData: any): string {
      // 生成朋友ID（需要使用IIFE处理异步）
      const friendId = (async () => await this.generateFriendId(friendData.name))();
      
      // 生成标准Markdown模板，包含属性及嵌入查询
      return `# ${friendData.name}

alias: ${JSON.stringify(friendData.nickname ? [friendData.nickname] : [])}
birthday: ${friendData.birthday || ''}
met-date: ${friendData.metDate}
met-location: ${friendData.metLocation || ''}
relationship: ${friendData.relationship}
tags: ${JSON.stringify(friendData.tags || [])}
contact-phone: ${friendData.contact?.phone || ''}
contact-wechat: ${friendData.contact?.wechat || ''}
contact-email: ${friendData.contact?.email || ''}
intimacy: ${friendData.intimacyLevel || 5}

## 基本信息

**姓名**: ${friendData.name}
**昵称**: ${friendData.nickname || ''}
**认识时间**: ${friendData.metDate}
**认识地点**: ${friendData.metLocation || ''}
**关系**: ${friendData.relationship}
**亲密度**: ${'⭐'.repeat(friendData.intimacyLevel || 5)}${'☆'.repeat(10 - (friendData.intimacyLevel || 5))}

## 联系方式

- **电话**: ${friendData.contact?.phone || ''}
- **微信**: ${friendData.contact?.wechat || ''}
- **邮箱**: ${friendData.contact?.email || ''}
- **社交媒体**: ${friendData.contact?.socialMedia || ''}

## 个人备注

${friendData.notes || ''}

## 互动记录

{{SELECT * FROM blocks WHERE path LIKE '/Interactions/%' AND attr ->> 'friend-id' = '${friendId}' ORDER BY created DESC}}

## 财务记录

{{SELECT * FROM blocks WHERE path LIKE '/Financial/%' AND attr ->> 'friend-id' = '${friendId}' ORDER BY created DESC}}
`;
  }

  /**
   * 设置朋友文档的属性
   * @param blockId 文档块ID
   * @param friendData 朋友信息数据
   */
  async setFriendAttributes(blockId: string, friendData: any) {
      log(`Setting attributes for friend block ID: ${blockId}`);
      
      // 将friendData展平后写入块属性
      const attributes = {
          'friend-id': await this.generateFriendId(friendData.name),
          'friend-name': friendData.name,
          'friend-nickname': friendData.nickname || '',
          'friend-birthday': friendData.birthday || '',
          'friend-met-date': friendData.metDate,
          'friend-met-location': friendData.metLocation || '',
          'friend-relationship': friendData.relationship,
          'friend-tags': JSON.stringify(friendData.tags || []),
          'friend-intimacy': friendData.intimacyLevel || 5,
          'friend-contact-phone': friendData.contact?.phone || '',
          'friend-contact-wechat': friendData.contact?.wechat || '',
          'friend-contact-email': friendData.contact?.email || '',
          'friend-last-contact': friendData.lastContactDate || ''
      };

      // 使用思源API设置属性
      await this.setBlockAttrs(blockId, attributes);
      log(`Attributes set for friend block ID: ${blockId}`);
  }

  /**
   * 从块数据解析朋友信息
   * @param block 块数据
   * @returns 解析后的朋友对象
   */
  async parseFriendFromBlock(block: any) {
      try {
          const attrs = block.attributes || {};

          return {
              id: block.id,
              name: attrs['friend-name'] || block.content,
              nickname: attrs['friend-nickname'],
              birthday: attrs['friend-birthday'],
              metDate: attrs['friend-met-date'],
              metLocation: attrs['friend-met-location'],
              relationship: attrs['friend-relationship'],
              tags: JSON.parse(attrs['friend-tags'] || '[]'),
              intimacyLevel: parseInt(attrs['friend-intimacy']) || 5,
              contact: {
                  phone: attrs['friend-contact-phone'],
                  wechat: attrs['friend-contact-wechat'],
                  email: attrs['friend-contact-email']
              },
              lastContactDate: attrs['friend-last-contact'],
              created: block.created,
              updated: block.updated
          };
      } catch (error) {
          console.error(`Failed to parse friend from block ${block.id}:`, error);
          return null;
      }
  }

  /**
   * 生成唯一的朋友ID
   * @param name 朋友姓名
   * @returns 生成的朋友ID
   */
  async generateFriendId(name: string): Promise<string> {
      // 生成唯一的朋友ID，作为属性和文件名的一部分
      const baseId = 'friend-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      // 检查ID是否已存在，如果存在则添加随机字符串
      if (this.friends.has(baseId)) {
          const randomStr = Math.random().toString(36).substr(2, 5);
          return `${baseId}-${randomStr}`;
      }
      
      return baseId;
  }

  /**
   * 封装思源笔记的SQL查询API
   * @param sql SQL查询语句
   * @returns 查询结果
   */
  async querySQL(sql: string) {
      try {
          if (!(window as any).siyuan?.querySQL) {
              throw new Error('siyuan.querySQL API is not available');
          }
          return await (window as any).siyuan.querySQL(sql);
      } catch (error) {
          console.error('SQL query failed:', sql, error);
          throw error;
      }
  }

  /**
   * 封装思源笔记的创建文档API
   * @param path 文档路径
   * @param content 文档内容
   * @returns 创建结果
   */
  async createDocument(path: string, content: string) {
      try {
          if (!(window as any).siyuan?.createDocument) {
              throw new Error('siyuan.createDocument API is not available');
          }
          return await (window as any).siyuan.createDocument(path, content);
      } catch (error) {
          console.error(`Failed to create document at ${path}:`, error);
          throw error;
      }
  }

  /**
   * 封装思源笔记的设置块属性API
   * @param blockId 块ID
   * @param attrs 要设置的属性
   * @returns 设置结果
   */
  async setBlockAttrs(blockId: string, attrs: Record<string, string>) {
      try {
          if (!(window as any).siyuan?.setBlockAttrs) {
              throw new Error('siyuan.setBlockAttrs API is not available');
          }
          return await (window as any).siyuan.setBlockAttrs(blockId, attrs);
      } catch (error) {
          console.error(`Failed to set attributes for block ${blockId}:`, error);
          throw error;
      }
  }
}