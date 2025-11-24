// 右侧侧边栏面板，负责展示朋友列表和快速操作按钮
class FriendshipPanel {
  constructor(plugin) {
      // 保存插件实例，便于调用 manager/logger
      this.plugin = plugin;
      this.element = null;
      this.isVisible = false;
  }

  create() {
      this.element = document.createElement('div');
      this.element.className = 'friendship-panel';
      this.element.innerHTML = this.render();
      
      // 添加到思源界面
      this.addToSiYuan();
      
      this.bindEvents();
  }

  destroy() {
      if (this.element) {
          this.element.remove();
          this.element = null;
      }
  }

  render() {
      // 返回完整的面板 HTML 模板，后续通过 innerHTML 注入
      const i18n = this.plugin.i18n;
      
      return `
          <div class="friendship-panel__header">
              <h3>${i18n.friendManagement || '朋友管理'}</h3>
              <button class="friendship-panel__add-btn" onclick="friendshipPlugin.panel.showAddFriend()">
                  ${i18n.addFriend || '添加朋友'}
              </button>
          </div>
          
          <div class="friendship-panel__search">
              <input type="text" 
                     placeholder="${i18n.searchFriends || '搜索朋友...'}" 
                     class="friendship-panel__search-input" />
          </div>
          
          <div class="friendship-panel__filters">
              <select class="friendship-panel__relationship-filter">
                  <option value="">所有关系</option>
                  <option value="同事">同事</option>
                  <option value="同学">同学</option>
                  <option value="朋友">朋友</option>
                  <option value="家人">家人</option>
              </select>
              
              <select class="friendship-panel__tag-filter">
                  <option value="">所有标签</option>
              </select>
          </div>
          
          <div class="friendship-panel__list">
              <!-- 朋友列表将通过JS动态加载 -->
              <div class="friendship-panel__loading">加载中...</div>
          </div>
          
          <div class="friendship-panel__quick-actions">
              <button class="friendship-panel__action-btn" data-action="quick-record">
                  ${i18n.quickRecord || '快速记录'}
              </button>
              <button class="friendship-panel__action-btn" data-action="reminders">
                  ${i18n.upcomingReminders || '即将提醒'}
              </button>
              <button class="friendship-panel__action-btn" data-action="analytics">
                  ${i18n.analytics || '数据分析'}
              </button>
          </div>
          
          <!-- 快速记录对话框 -->
          <div class="friendship-dialog" id="quick-record-dialog" style="display: none;">
              <div class="friendship-dialog__content">
                  <h4>快速记录互动</h4>
                  <form id="quick-record-form">
                      <div class="form-group">
                          <label>朋友</label>
                          <select name="friendId" required>
                              <option value="">选择朋友</option>
                          </select>
                      </div>
                      <div class="form-group">
                          <label>类型</label>
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
                          <label>心情</label>
                          <div class="mood-selector">
                              <span class="mood-option" data-value="1">😢</span>
                              <span class="mood-option" data-value="2">😐</span>
                              <span class="mood-option" data-value="3" data-selected>😊</span>
                              <span class="mood-option" data-value="4">😄</span>
                              <span class="mood-option" data-value="5">🤩</span>
                          </div>
                      </div>
                      <div class="form-group">
                          <label>内容</label>
                          <textarea name="content" rows="3" placeholder="记录这次互动的详情..." required></textarea>
                      </div>
                      <div class="form-actions">
                          <button type="button" class="btn-cancel">取消</button>
                          <button type="submit" class="btn-submit">保存</button>
                      </div>
                  </form>
              </div>
          </div>
      `;
  }

  async bindEvents() {
      // 绑定搜索筛选、按钮点击等事件；该函数在 create 后立即执行
      // 搜索功能
      const searchInput = this.element.querySelector('.friendship-panel__search-input');
      searchInput.addEventListener('input', this.debounce(() => {
          this.filterFriends(searchInput.value);
      }, 300));

      // 筛选器
      const relationshipFilter = this.element.querySelector('.friendship-panel__relationship-filter');
      relationshipFilter.addEventListener('change', () => {
          this.applyFilters();
      });

      // 快速操作按钮
      const actionButtons = this.element.querySelectorAll('.friendship-panel__action-btn');
      actionButtons.forEach(btn => {
          btn.addEventListener('click', () => {
              const action = btn.dataset.action;
              this.handleAction(action);
          });
      });

      // 快速记录表单
      const quickRecordForm = this.element.querySelector('#quick-record-form');
      quickRecordForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleQuickRecordSubmit(e.target);
      });

      // 加载朋友列表
      await this.loadFriendsList();
  }

  async loadFriendsList() {
      // 从 FriendManager 拉取朋友列表并渲染
      try {
          const friends = await this.plugin.friendManager.searchFriends('');
          this.renderFriendsList(friends);
      } catch (error) {
          console.error('Failed to load friends list:', error);
          this.showError('加载朋友列表失败');
      }
  }

  renderFriendsList(friends) {
      // 根据朋友列表生成卡片，空列表时显示占位文本
      const listContainer = this.element.querySelector('.friendship-panel__list');
      
      if (friends.length === 0) {
          listContainer.innerHTML = '<div class="friendship-panel__empty">暂无朋友记录</div>';
          return;
      }

      const html = friends.map(friend => `
          <div class="friend-card" data-friend-id="${friend.id}">
              <div class="friend-card__header">
                  <h4 class="friend-card__name">${friend.name}</h4>
                  <span class="friend-card__relationship">${friend.relationship}</span>
              </div>
              <div class="friend-card__details">
                  <div class="friend-card__intimacy">
                      亲密度: ${'⭐'.repeat(friend.intimacyLevel)}${'☆'.repeat(10 - friend.intimacyLevel)}
                  </div>
                  <div class="friend-card__tags">
                      ${friend.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                  </div>
                  <div class="friend-card__last-contact">
                      最后联系: ${friend.lastContactDate ? new Date(friend.lastContactDate).toLocaleDateString() : '暂无'}
                  </div>
              </div>
              <div class="friend-card__actions">
                  <button class="btn-sm" onclick="friendshipPlugin.panel.viewFriend('${friend.id}')">查看</button>
                  <button class="btn-sm" onclick="friendshipPlugin.panel.quickRecordWithFriend('${friend.id}')">记录</button>
              </div>
          </div>
      `).join('');

      listContainer.innerHTML = html;
  }

  async filterFriends(query) {
      // 根据搜索词 + 筛选条件过滤展示数据
      const relationshipFilter = this.element.querySelector('.friendship-panel__relationship-filter');
      const filters = {
          relationship: relationshipFilter.value || undefined
      };

      const friends = await this.plugin.friendManager.searchFriends(query, filters);
      this.renderFriendsList(friends);
  }

  async applyFilters() {
      // 关系/标签选择器的统一入口
      const searchInput = this.element.querySelector('.friendship-panel__search-input');
      this.filterFriends(searchInput.value);
  }

  showQuickRecord(friendId = '') {
      // 弹出快速记录对话框，可预选朋友
      const dialog = this.element.querySelector('#quick-record-dialog');
      const friendSelect = dialog.querySelector('select[name="friendId"]');
      
      // 填充朋友选择框
      this.populateFriendSelect(friendSelect);
      
      if (friendId) {
          friendSelect.value = friendId;
      }
      
      dialog.style.display = 'block';
  }

  hideQuickRecord() {
      const dialog = this.element.querySelector('#quick-record-dialog');
      dialog.style.display = 'none';
  }

  async populateFriendSelect(selectElement) {
      // 动态填充朋友下拉框，避免内容过期
      const friends = await this.plugin.friendManager.searchFriends('');
      
      selectElement.innerHTML = '<option value="">选择朋友</option>' +
          friends.map(friend => 
              `<option value="${friend.id}">${friend.name}</option>`
          ).join('');
  }

  async handleQuickRecordSubmit(form) {
      // 表单提交时调用 InteractionLogger 写入记录
      const formData = new FormData(form);
      const interactionData = {
          friendId: formData.get('friendId'),
          type: formData.get('type'),
          date: formData.get('date'),
          mood: parseInt(form.querySelector('.mood-option[data-selected]')?.dataset.value || '3'),
          content: formData.get('content')
      };

      try {
          await this.plugin.interactionLogger.logInteraction(interactionData);
          this.hideQuickRecord();
          form.reset();
          this.showSuccess('互动记录已保存');
      } catch (error) {
          console.error('Failed to save interaction:', error);
          this.showError('保存失败');
      }
  }

  async showAddFriend() {
      // 该函数依赖尚未实现的 showFriendForm，可在未来补充对话框
      // 实现添加朋友对话框
      const friendData = await this.showFriendForm();
      if (friendData) {
          try {
              await this.plugin.friendManager.createFriend(friendData);
              this.showSuccess('朋友已添加');
              await this.loadFriendsList();
          } catch (error) {
              this.showError('添加朋友失败');
          }
      }
  }

  handleAction(action) {
      // 快速操作区按钮入口，根据 action 切换不同功能
      switch (action) {
          case 'quick-record':
              this.showQuickRecord();
              break;
          case 'reminders':
              this.showReminders();
              break;
          case 'analytics':
              this.showAnalytics();
              break;
      }
  }

  quickRecordWithFriend(friendId) {
      this.showQuickRecord(friendId);
  }

  async viewFriend(friendId) {
      // 通过 blockId 打开对应文档，需依赖思源 openDocument API
      // 打开朋友详情页面
      const friend = this.plugin.friendManager.friends.get(friendId);
      if (friend) {
          // 使用思源API打开文档
          await (window as any).siyuan.openDocument(friend.id);
      }
  }

  showReminders() {
      // TODO: 接入 reminderSystem 后在这里展示提醒中心
      // 显示提醒中心
      console.log('Show reminders');
  }

  showAnalytics() {
      // TODO: 接入 analyticsDashboard 后展示统计图表
      // 显示数据分析
      console.log('Show analytics');
  }

  showSuccess(message) {
      // 统一的成功提示
      // 显示成功消息
      this.showMessage(message, 'success');
  }

  showError(message) {
      // 统一的错误提示
      // 显示错误消息
      this.showMessage(message, 'error');
  }

  showMessage(message, type) {
      // 将提示信息渲染到面板中，3 秒后自动消失
      const messageEl = document.createElement('div');
      messageEl.className = `friendship-message friendship-message--${type}`;
      messageEl.textContent = message;
      
      this.element.appendChild(messageEl);
      
      setTimeout(() => {
          messageEl.remove();
      }, 3000);
  }

  debounce(func, wait) {
      // 简易防抖工具，避免频繁触发搜索
      let timeout;
      return function executedFunction(...args) {
          const later = () => {
              clearTimeout(timeout);
              func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
      };
  }

  addToSiYuan() {
      // 使用思源API将面板添加到界面
      // window.siyuan.addPanel(this.element, { position: 'right' });
  }
}