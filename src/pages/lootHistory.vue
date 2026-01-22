<template>
  <div
    class="app-container"
    :class="{
      'is-onboarding':
        !currentHandle || showTimeSetup || lootRecords.length === 0,
    }"
  >
    <transition name="fade">
      <div v-if="isInitializing" class="initial-loading">
        <div class="loading-card">
          <div class="spinner-large"></div>
          <div class="loading-title">正在准备数据...</div>
          <p class="loading-subtitle">初次加载可能需要一些时间</p>
        </div>
      </div>
    </transition>

    <template v-if="!isInitializing">
      <transition name="fade">
        <div v-if="isLoading" class="loading-overlay">
          <div class="spinner"></div>
          <div class="loading-txt">解析中 {{ loadingProgress }}%</div>
        </div>
      </transition>

      <main
        v-if="lootRecords.length > 0"
        class="app-main"
        style="padding-top: 10px"
      >
        <div class="control-bar" style="position: relative">
          <div
            v-if="isDragOverWindow"
            class="drag-guide-zone"
            :class="{ 'is-active': isDragOverZone }"
            @drop.stop.prevent="handleZoneDrop"
            @dragover.prevent
            @dragenter="isDragOverZone = true"
            @dragleave="isDragOverZone = false"
          >
            <el-icon class="guide-icon"><UploadFilled /></el-icon>
            <span>释放文件以导入备份</span>
          </div>

          <div class="path-toolbar">
            <el-button
              type="primary"
              size="small"
              :loading="isSyncing"
              @click="syncLogFiles"
            >
              {{ isSyncing ? '同步中' : '立即同步' }}
            </el-button>

            <el-date-picker
              v-model="syncStartDate"
              type="datetime"
              size="small"
              placeholder="起始时间"
              format="YYYY/MM/DD HH:mm"
              value-format="YYYY-MM-DDTHH:mm"
              :clearable="false"
              @change="handleSyncDateChange"
              class="date-picker-el"
            />
            <span class="range-sep">-</span>
            <el-date-picker
              v-model="syncEndDate"
              type="datetime"
              size="small"
              placeholder="截止时间(可选)"
              format="YYYY/MM/DD HH:mm"
              value-format="YYYY-MM-DDTHH:mm"
              clearable
              @change="handleSyncDateChange"
              class="date-picker-el"
            />

            <div class="v-divider"></div>

            <el-button @click="setLogPath" plain class="tool-btn">
              <el-icon><FolderOpened /></el-icon>
              <span>切换目录</span>
            </el-button>

            <el-dropdown trigger="click" @command="handleDataCommand">
              <el-button plain class="tool-btn">
                <el-icon><Setting /></el-icon>
                <span>数据管理</span>
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="import">
                    <el-icon><Upload /></el-icon>导入备份 (JSON)
                  </el-dropdown-item>
                  <el-dropdown-item command="export">
                    <el-icon><Download /></el-icon>导出备份 (JSON)
                  </el-dropdown-item>
                  <el-dropdown-item
                    command="clear"
                    divided
                    style="color: #f56c6c"
                  >
                    <el-icon><Delete /></el-icon>清空数据库
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>

            <el-button @click="openManualAddDialog" plain class="tool-btn">
              <el-icon><Plus /></el-icon>
              <span>手动添加</span>
            </el-button>
          </div>

          <!-- Controls moved here -->
          <div class="control-right" style="margin-left: auto">
            <CommonThemeToggle storage-key="loot-history-theme" />
          </div>
        </div>

        <div class="filter-panel">
          <!-- Filter Panel Content Remains Identical -->
          <div class="filter-section">
            <div class="sec-header">
              <div class="sec-title-group">
                <span class="title-main"
                  >👥 玩家 ({{ visiblePlayerCount }})</span
                >
                <div class="header-sep"></div>
                <el-button
                  @click="showRoleDialog = true"
                  size="small"
                  class="soft-action-btn primary"
                >
                  <el-icon><User /></el-icon>
                  <span>固定队职位设置</span>
                </el-button>
                <div class="header-sep"></div>
                <label class="switch-box">
                  <el-switch
                    v-model="showOnlyRole"
                    size="small"
                    style="
                      --el-switch-on-color: #3b82f6;
                      --el-switch-off-color: #cbd5e1;
                    "
                  />
                  <span class="switch-label">只显示职位</span>
                </label>
                <div class="header-sep"></div>
                <el-popover
                  placement="bottom"
                  title="未完成职位设置"
                  :width="220"
                  content="需在“职位设置”中填满 MT~D4 共 8 个核心职位后方可开启"
                  :disabled="isRaidRolesComplete"
                >
                  <template #reference>
                    <div
                      class="switch-container"
                      style="
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                      "
                    >
                      <el-switch
                        v-model="isOnlyRaidMembersActive"
                        :disabled="!isRaidRolesComplete"
                        size="small"
                        style="--el-switch-on-color: #3b82f6"
                      />
                      <span
                        class="switch-label"
                        :style="{
                          opacity: isRaidRolesComplete ? 1 : 0.5,
                          fontSize: '12px',
                        }"
                      >
                        只看固定队
                      </span>
                    </div>
                  </template>
                </el-popover>
              </div>
              <div class="acts">
                <el-popover placement="bottom" :width="320" trigger="click">
                  <template #reference>
                    <el-button size="small" class="soft-action-btn"
                      >合并大小号</el-button
                    >
                  </template>
                  <div class="popover-form">
                    <div class="merge-selector-box">
                      <div class="selector-title">选择两个玩家进行合并：</div>
                      <div class="selector-tags">
                        <el-check-tag
                          v-for="p in selectablePlayersForMerge"
                          :key="p"
                          :checked="selectionForMerge.includes(p)"
                          @change="handlePlayerSelectForMerge(p)"
                        >
                          {{ p }}
                        </el-check-tag>
                      </div>
                      <div
                        class="merge-actions"
                        v-if="selectionForMerge.length === 2"
                      >
                        <el-button
                          type="primary"
                          size="small"
                          @click="confirmMergeSelection"
                          style="width: 100%"
                        >
                          确认合并: {{ selectionForMerge[0] }} ->
                          {{ selectionForMerge[1] }}
                        </el-button>
                      </div>
                    </div>

                    <div
                      v-if="mergeSuggestions.length > 0"
                      class="suggestion-box"
                    >
                      <div class="suggest-title">
                        💡 发现疑似换号 (>90% 重合)：
                      </div>
                      <div class="suggest-items">
                        <el-button
                          v-for="s in mergeSuggestions"
                          :key="s.from + s.to"
                          size="small"
                          plain
                          class="suggest-btn"
                          @click="addMapping(s.from, s.to)"
                        >
                          {{ s.from }} → {{ s.to }}
                          <span class="conf-text">({{ s.confidence }}%)</span>
                        </el-button>
                      </div>
                    </div>

                    <div
                      class="mapping-box"
                      v-if="Object.keys(playerMapping).length > 0"
                    >
                      <div class="selector-title">当前合并映射:</div>
                      <div class="mapping-list">
                        <el-tag
                          v-for="(to, from) in playerMapping"
                          :key="from"
                          closable
                          size="small"
                          type="info"
                          @close="removeMapping(from)"
                        >
                          {{ from }} → {{ to }}
                        </el-tag>
                      </div>
                    </div>
                  </div>
                </el-popover>
                <span class="hint-small"
                  >Ctrl + 鼠标左键 = 复制，Alt + 鼠标左键 = 单独显示</span
                >
              </div>
            </div>
            <div class="sec-body" style="position: relative">
              <div v-if="isOnlyRaidMembersActive" class="section-mask"></div>
              <el-check-tag
                v-for="p in visibleAllPlayers"
                :key="p"
                :checked="isPlayerChecked(p)"
                :class="{
                  'auto-disabled-tag': isPlayerAutoDisabled(p),
                  'readonly-tag': isOnlyRaidMembersActive,
                }"
                @click.stop="handlePlayerClick($event, p)"
                class="mini-tag-el player-tag"
              >
                <PlayerDisplay
                  :name="p"
                  :role="getPlayerRole(p)"
                  :show-only-role="showOnlyRole"
                />
              </el-check-tag>
            </div>
          </div>
          <div class="filter-section">
            <div class="sec-header">
              <div class="sec-title-group">
                <span class="title-main">📦 物品 ({{ visibleItemCount }})</span>
                <div class="header-sep"></div>
                <el-popover
                  placement="bottom-start"
                  :width="200"
                  trigger="click"
                >
                  <template #reference>
                    <el-button size="small" class="soft-action-btn"
                      >杂物屏蔽设置</el-button
                    >
                  </template>
                  <div class="filter-popover">
                    <div class="pop-title">屏蔽杂物</div>
                    <div class="filter-list">
                      <el-checkbox
                        v-model="systemFilterSettings.cards"
                        label="九宫幻卡"
                        size="small"
                      />
                      <el-checkbox
                        v-model="systemFilterSettings.materia"
                        label="魔晶石"
                        size="small"
                      />
                      <el-checkbox
                        v-model="systemFilterSettings.music"
                        label="乐谱"
                        size="small"
                      />
                      <el-checkbox
                        v-model="systemFilterSettings.book"
                        label="零式断章"
                        size="small"
                      />
                      <el-checkbox
                        v-model="systemFilterSettings.totem"
                        label="极神图腾"
                        size="small"
                      />
                      <el-checkbox
                        v-model="systemFilterSettings.other"
                        label="经验值/金币"
                        size="small"
                      />

                      <template v-if="availableSeries.length > 0">
                        <div
                          class="pop-title"
                          style="margin: 8px 0 4px; padding-top: 8px"
                        >
                          屏蔽装备系列
                        </div>
                        <el-checkbox-group
                          v-model="systemFilterSettings.maskedSeries"
                          style="
                            display: flex;
                            flex-direction: column;
                            gap: 4px;
                          "
                        >
                          <el-checkbox
                            v-for="s in availableSeries"
                            :key="s"
                            :label="s"
                            size="small"
                          >
                            {{ s }}系列
                          </el-checkbox>
                        </el-checkbox-group>
                      </template>
                    </div>
                  </div>
                </el-popover>
                <div class="header-sep"></div>
                <label class="switch-box">
                  <el-switch
                    v-model="isRaidFilterActive"
                    size="small"
                    style="
                      --el-switch-on-color: #3b82f6;
                      --el-switch-off-color: #cbd5e1;
                    "
                  />
                  <span class="switch-label">只看零式掉落</span>
                </label>
              </div>
              <div class="acts">
                <span class="hint-small"
                  >Ctrl + 鼠标左键 = 复制，Alt + 鼠标左键 = 单独显示</span
                >
              </div>
            </div>
            <div class="sec-body" style="position: relative">
              <div v-if="isRaidFilterActive" class="section-mask"></div>
              <el-check-tag
                v-for="item in visibleUniqueItems"
                :key="item"
                :checked="isItemChecked(item)"
                :class="{
                  'auto-disabled-tag': isItemAutoDisabled(item),
                  'readonly-tag': isRaidFilterActive,
                }"
                @click.stop="handleItemClick($event, item)"
                class="mini-tag-el item-tag"
              >
                {{ item }}
              </el-check-tag>
            </div>
          </div>
        </div>

        <div class="main-viewport" style="position: relative">
          <el-tabs
            v-if="filteredRecords.length > 0"
            v-model="viewMode"
            class="mode-tabs-el"
            type="card"
          >
            <el-tab-pane label="按玩家" name="summary">
              <div class="tabs-sort-control">
                <LootSortSegmented v-model="summarySortMode" />
              </div>
              <div class="summary-grid has-sort-control">
                <div
                  v-for="player in sortedSummaryPlayers"
                  :key="player"
                  class="summary-card"
                >
                  <div class="summary-header">
                    <PlayerDisplay
                      :name="player"
                      :role="getPlayerRole(player)"
                      :show-only-role="showOnlyRole"
                    />
                  </div>
                  <div
                    v-for="itemName in getSortedItemsInPlayerSummary(player)"
                    :key="itemName"
                    class="summary-item"
                  >
                    <span class="s-name">{{ itemName }}</span>
                    <span
                      :class="[
                        'count-badge',
                        (playerSummary[player]?.[itemName] ?? 0) > 1
                          ? 'count-many'
                          : 'count-single',
                      ]"
                      >x{{ playerSummary[player]?.[itemName] ?? 0 }}</span
                    >
                  </div>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="按部位" name="slot">
              <div class="tabs-sort-control">
                <LootSortSegmented v-model="slotSortMode" />
              </div>
              <div class="summary-grid slot-grid has-sort-control">
                <div
                  v-for="slot in displaySlots"
                  :key="slot"
                  class="summary-card"
                >
                  <div class="summary-header">{{ slot }}</div>
                  <div>
                    <div
                      v-for="player in getSortedPlayersInSlot(
                        slotSummary[slot] || {},
                      )"
                      :key="player"
                      class="summary-item"
                    >
                      <PlayerDisplay
                        class="s-name"
                        :name="player"
                        :role="getPlayerRole(player)"
                        :show-only-role="showOnlyRole"
                      />
                      <span
                        :class="[
                          'count-badge',
                          (slotSummary[slot]?.[player] || 0) > 1
                            ? 'count-many'
                            : 'count-single',
                        ]"
                        >x{{ slotSummary[slot]?.[player] || 0 }}</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="按CD周" name="week">
              <div class="tabs-sort-control">
                <LootSortSegmented v-model="weekSortMode" />
              </div>
              <div class="week-content-wrapper">
                <div
                  class="summary-grid has-sort-control"
                  :class="{ 'is-compact-role': showOnlyRole }"
                >
                  <div
                    v-for="week in sortedWeeks"
                    :key="week"
                    class="summary-card"
                    @contextmenu.prevent
                  >
                    <div class="summary-header">
                      {{ getFormattedWeekLabel(week) }}
                    </div>
                    <div class="week-list-body">
                      <div
                        v-for="recordsGroup in [getSortedRecordsInWeek(week)]"
                        :key="recordsGroup.length + week"
                      >
                        <template
                          v-for="(rec, idx) in recordsGroup"
                          :key="rec.key"
                        >
                          <el-tooltip
                            v-if="true"
                            :disabled="
                              !rawSuspiciousKeys.has(rec.key) ||
                              recordWeekCorrections[rec.key] !== undefined
                            "
                            content="可能归属周错误（通常发生在周二压线进本）。点击可选择将其归入上一周。"
                            placement="top"
                          >
                            <div
                              class="summary-item week-record-row"
                              :class="{
                                'is-corrected': recordWeekCorrections[rec.key],
                                'is-suspicious':
                                  rawSuspiciousKeys.has(rec.key) &&
                                  !recordWeekCorrections[rec.key],
                              }"
                              @contextmenu.prevent="
                                handleRecordTrigger($event, rec)
                              "
                              @click.stop="handleRecordTrigger($event, rec)"
                            >
                              <div class="week-row-aside">
                                <PlayerDisplay
                                  :name="rec.player"
                                  :role="getPlayerRole(rec.player)"
                                  :show-only-role="showOnlyRole"
                                  name-class="week-player-name"
                                />
                              </div>
                              <div class="week-row-main">
                                <span class="week-item-name">{{
                                  rec.item
                                }}</span>
                                <el-icon
                                  v-if="
                                    rawSuspiciousKeys.has(rec.key) &&
                                    !recordWeekCorrections[rec.key]
                                  "
                                  class="row-status-icon is-warning"
                                  ><Warning
                                /></el-icon>
                                <el-icon
                                  v-if="recordWeekCorrections[rec.key]"
                                  class="row-status-icon is-info"
                                  ><Timer
                                /></el-icon>
                              </div>
                            </div>
                          </el-tooltip>
                          <div
                            v-if="shouldShowWeekDivider(recordsGroup, idx)"
                            class="week-list-divider"
                          ></div>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Singleton Context Menu -->
              <!-- Singleton Context Menu (Elegant Virtual Trigger) -->
              <el-popover
                v-model:visible="isMenuVisible"
                :virtual-ref="contextMenuRef"
                virtual-triggering
                popper-class="context-menu-popper"
                :width="180"
                :show-arrow="false"
                placement="bottom-start"
              >
                <div v-if="contextMenuRecord" class="custom-context-menu">
                  <div class="menu-info-header">
                    <el-icon><Calendar /></el-icon>
                    <span>{{ formatTime(contextMenuRecord.timestamp) }}</span>
                  </div>
                  <div class="menu-divider"></div>
                  <div class="menu-action-item" @click="handleCorrectionClick">
                    <el-icon class="action-arrow">
                      <component
                        :is="
                          recordWeekCorrections[contextMenuRecord.key]
                            ? RefreshLeft
                            : RefreshRight
                        "
                      />
                    </el-icon>
                    <span class="action-label">
                      {{
                        recordWeekCorrections[contextMenuRecord.key]
                          ? '归回原始周'
                          : '归入上一周'
                      }}
                    </span>
                  </div>
                </div>
              </el-popover>
            </el-tab-pane>

            <el-tab-pane label="图表分析" name="chart" lazy>
              <LootStatisticsPanel
                :records="filteredRecords"
                :players="visibleAllPlayers"
                :get-actual-player="getActualPlayer"
                :get-player-role="getPlayerRole"
                :record-week-corrections="recordWeekCorrections"
                :sync-start-date="syncStartDate"
                :player-visibility="showOnlyRole ? 'role' : 'all'"
              />
            </el-tab-pane>

            <el-tab-pane label="BIS分配" name="bis">
              <BisAllocator
                v-model="bisConfig"
                v-model:sortMode="bisSortMode"
                :players="visibleAllPlayers"
                :records="filteredRecords"
                :get-player-role="getPlayerRole"
                :show-only-role="showOnlyRole"
              />
            </el-tab-pane>

            <el-tab-pane label="详细记录" name="list">
              <div class="list-container-el">
                <el-table
                  :data="paginatedRecords"
                  style="width: 100%"
                  class="loot-record-table"
                  cell-class-name="loot-cell"
                >
                  <el-table-column label="周" width="60" align="center">
                    <template #default="scope">
                      <div class="col-week">
                        W{{ getRawRaidWeekNum(scope.row.timestamp) }}
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="时间" width="140">
                    <template #default="scope">
                      <div class="col-time">
                        <span class="time-date">{{
                          formatTime(scope.row.timestamp)
                        }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="物品" width="300">
                    <template #default="scope">
                      <div class="col-item">
                        <span class="item-text">{{ scope.row.item }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="获得者" width="200">
                    <template #default="scope">
                      <LootPlayerRoll
                        v-if="getWinnerRollInfo(scope.row)"
                        :roll="getWinnerRollInfo(scope.row)!"
                        is-winner
                        :show-only-role="showOnlyRole"
                        :get-player-role="getPlayerRole"
                      />
                      <div v-else class="no-winner">未分配</div>
                    </template>
                  </el-table-column>
                  <el-table-column label="其他 Roll 点记录">
                    <template #default="scope">
                      <div class="col-rolls">
                        <LootPlayerRoll
                          v-for="roll in getOtherRolls(scope.row)"
                          :key="roll.player"
                          :roll="roll"
                          :show-only-role="showOnlyRole"
                          :get-player-role="getPlayerRole"
                        />
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="60" align="center">
                    <template #default="scope">
                      <el-popconfirm
                        title="确定永久删除吗？"
                        confirm-button-text="删除"
                        cancel-button-text="取消"
                        @confirm="deleteRecord(scope.row)"
                      >
                        <template #reference>
                          <el-button
                            type="danger"
                            :icon="Delete"
                            size="small"
                            circle
                            plain
                          />
                        </template>
                      </el-popconfirm>
                    </template>
                  </el-table-column>
                </el-table>

                <div class="pagination-box">
                  <el-pagination
                    v-model:current-page="currentPage"
                    :page-size="50"
                    layout="total, prev, pager, next"
                    :total="filteredRecords.length"
                    small
                  />
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>

          <!-- 筛选结果为空时的引导 -->
          <div v-else class="empty-placeholder">
            <div class="empty-icon">
              <el-icon><Search /></el-icon>
            </div>
            <div class="empty-title">未发现匹配记录</div>
            <p class="empty-desc">
              当前筛选条件过于严格，数据库中有数据但未能匹配。<br />
              请尝试<span class="empty-highlight">清除筛选条件</span
              >或调整时间范围。
            </p>
            <div class="empty-hint">
              <el-button type="info" plain @click="resetFilters"
                >显示所有掉落</el-button
              >
            </div>
          </div>
        </div>
      </main>

      <!-- 数据库完全为空时的引导 -->
      <div v-else class="empty-container">
        <!-- 核心引导流程：步进式 -->
        <div class="empty-placeholder compact-guide">
          <!-- 状态 1: 未设置目录 -->
          <template v-if="!currentHandle">
            <div class="empty-guide-main">
              <div class="empty-info-side">
                <div class="empty-title">欢迎使用 Loot History</div>
                <p class="empty-desc">
                  选择你的<span class="empty-highlight">FFXIV 日志文件夹</span
                  >，开始记录掉落。
                </p>
                <div class="empty-hint">
                  <el-button type="primary" size="large" @click="setLogPath">
                    选择日志目录
                  </el-button>
                </div>
              </div>
              <div class="guide-img-box" style="position: relative">
                <div
                  v-if="isDragOverWindow"
                  class="setup-drag-zone"
                  :class="{ 'is-active': isDragOverZone }"
                  @drop.stop.prevent="handleZoneDrop"
                  @dragover.prevent
                  @dragenter="isDragOverZone = true"
                  @dragleave="isDragOverZone = false"
                >
                  <el-icon class="guide-icon"><UploadFilled /></el-icon>
                  <span>释放文件以导入备份</span>
                </div>
                <img
                  src="@/assets/screenshots/lootHistoryGuide.jpg"
                  alt="Guide"
                  class="guide-img"
                />
              </div>
            </div>
          </template>

          <!-- 状态 2: 已设置目录，配置时间范围 -->
          <template v-else-if="showTimeSetup">
            <div class="empty-title">设置同步范围</div>
            <p class="empty-desc">
              已关联目录：<span class="empty-highlight">{{
                currentHandle.name
              }}</span
              ><br />
              请指定你想要同步的历史记录起始时间。
            </p>
            <div class="setup-form">
              <div class="setup-row">
                <span class="setup-label">起始时间:</span>
                <el-date-picker
                  v-model="syncStartDate"
                  type="datetime"
                  placeholder="起始时间"
                  format="YYYY/MM/DD HH:mm"
                  value-format="YYYY-MM-DDTHH:mm"
                  :clearable="false"
                />
              </div>
              <div class="setup-row">
                <span class="setup-label">截止时间:</span>
                <el-date-picker
                  v-model="syncEndDate"
                  type="datetime"
                  placeholder="现在 (可选)"
                  format="YYYY/MM/DD HH:mm"
                  value-format="YYYY-MM-DDTHH:mm"
                />
              </div>
            </div>
            <div class="empty-hint" style="margin-top: 24px">
              <el-button @click="currentHandle = null" plain
                >返回重选</el-button
              >
              <el-button type="primary" size="large" @click="startInitialSync">
                开始解析并导入
              </el-button>
            </div>
          </template>

          <!-- 状态 3: 已设置目录，但数据库依然为空 (可能正在同步或同步结果为空) -->
          <template v-else>
            <div
              class="ready-state-container"
              style="
                position: relative;
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
              "
            >
              <div
                v-if="isDragOverWindow"
                class="setup-drag-zone"
                :class="{ 'is-active': isDragOverZone }"
                @drop.stop.prevent="handleZoneDrop"
                @dragover.prevent
                @dragenter="isDragOverZone = true"
                @dragleave="isDragOverZone = false"
              >
                <el-icon class="guide-icon"><UploadFilled /></el-icon>
                <span>释放文件以导入备份</span>
              </div>

              <div class="empty-title">
                {{ isSyncing ? '正在同步数据' : '准备就绪' }}
              </div>
              <p class="empty-desc">
                {{
                  isSyncing
                    ? '正在处理日志文件，请稍候。'
                    : '数据库当前为空。你可以开始解析数据，或从备份文件恢复。'
                }}
              </p>
              <div class="empty-hint">
                <el-button
                  v-if="!isSyncing"
                  @click="syncLogFiles"
                  type="primary"
                  size="large"
                  >开始解析数据</el-button
                >
                <el-button
                  v-if="!isSyncing"
                  @click="importInputRef?.click()"
                  plain
                  size="large"
                  >导入备份</el-button
                >
                <el-button v-if="!isSyncing" @click="showTimeSetup = true" plain
                  >调整时间范围</el-button
                >
              </div>

              <p class="hint-txt">
                仅支持 Chrome/Edge 等现代浏览器，需授予文件夹读取权限。
              </p>
            </div>
          </template>
        </div>
      </div>

      <el-dialog
        v-model="showManualAddDialog"
        title="手动添加记录"
        width="400px"
        append-to-body
      >
        <el-form label-width="80px">
          <el-form-item label="时间">
            <el-date-picker
              v-model="manualForm.timestamp"
              type="datetime"
              placeholder="选择获得时间"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="物品">
            <el-autocomplete
              v-model="manualForm.item"
              :fetch-suggestions="querySearchItems"
              placeholder="请输入物品名称"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="获得者">
            <el-autocomplete
              v-model="manualForm.player"
              :fetch-suggestions="querySearchPlayers"
              placeholder="请输入玩家名称"
              style="width: 100%"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="showManualAddDialog = false">取消</el-button>
            <el-button type="primary" @click="submitManualRecord"
              >确定添加</el-button
            >
          </span>
        </template>
      </el-dialog>

      <el-dialog
        v-model="showRoleDialog"
        title="成员职位设置"
        width="540px"
        class="role-settings-dialog"
        destroy-on-close
      >
        <div class="role-grid">
          <div
            v-for="role in ROLE_DEFINITIONS"
            :key="role"
            class="role-setup-item"
          >
            <div class="role-setup-label">
              <role-badge :role="role" />
            </div>
            <el-select
              v-model="playerRoles[role]"
              placeholder="选择玩家"
              filterable
              clearable
              size="default"
              style="flex: 1"
            >
              <el-option
                v-for="p in allPlayers.filter(
                  (p) => p === playerRoles[role] || !assignedPlayers.has(p),
                )"
                :key="p"
                :label="p"
                :value="p"
              />
            </el-select>
          </div>
        </div>

        <div class="role-divider">特殊分组</div>

        <div class="special-role-section">
          <div class="special-role-group">
            <div class="group-title">临时替补</div>
            <div class="special-list">
              <template v-for="(p, role) in playerRoles" :key="role">
                <div v-if="role.startsWith('SUB:')" class="special-item">
                  <el-tag closable @close="delete playerRoles[role]">
                    {{ p }}
                  </el-tag>
                </div>
              </template>
              <el-select
                placeholder="添加替补"
                filterable
                size="small"
                @change="addSpecialRole($event, 'SUB')"
                value=""
                style="width: 120px"
              >
                <el-option
                  v-for="p in allPlayers.filter((p) => !assignedPlayers.has(p))"
                  :key="p"
                  :label="p"
                  :value="p"
                />
              </el-select>
            </div>
          </div>

          <div class="special-role-group">
            <div class="group-title">已离队</div>
            <div class="special-list">
              <template v-for="(p, role) in playerRoles" :key="role">
                <div v-if="role.startsWith('LEFT:')" class="special-item">
                  <el-tag closable @close="delete playerRoles[role]">
                    {{ p }}
                  </el-tag>
                </div>
              </template>
              <el-select
                placeholder="标记离队"
                filterable
                size="small"
                @change="addSpecialRole($event, 'LEFT')"
                value=""
                style="width: 120px"
              >
                <el-option
                  v-for="p in allPlayers.filter((p) => !assignedPlayers.has(p))"
                  :key="p"
                  :label="p"
                  :value="p"
                />
              </el-select>
            </div>
          </div>
        </div>

        <template #footer>
          <el-button @click="showRoleDialog = false" type="primary"
            >完成</el-button
          >
        </template>
      </el-dialog>
    </template>

    <input
      ref="importInputRef"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleImportFile"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useIndexedDB } from '@/composables/useIndexedDB'
import {
  ElMessageBox,
  ElCheckbox,
  ElSwitch,
  ElDialog,
  ElForm,
  ElFormItem,
  ElAutocomplete,
  ElMessage,
  ElSelect,
  ElOption,
  ElTag,
} from 'element-plus'
import {
  sanitizeItemName,
  sanitizePlayerName,
  ROLE_DEFINITIONS,
  type RollInfo,
  type LootRecord,
} from '@/utils/lootParser'
import {
  FolderOpened,
  Delete,
  Plus,
  Search,
  User,
  Setting,
  Upload,
  UploadFilled,
  Download,
  ArrowDown,
  Warning,
  Calendar,
  Timer,
  RefreshLeft,
  RefreshRight,
} from '@element-plus/icons-vue'
import LogParserWorker from '@/workers/logParser.ts?worker'
import LootPlayerRoll from '@/components/loot-history/LootPlayerRoll.vue'
import PlayerDisplay from '@/components/loot-history/PlayerDisplay.vue'
import LootSortSegmented from '@/components/loot-history/LootSortSegmented.vue'
import LootStatisticsPanel from '@/components/loot-history/charts/LootStatisticsPanel.vue'
import RoleBadge from '@/components/loot-history/RoleBadge.vue'
import BisAllocator, { type BisConfig } from '@/components/loot-history/BisAllocator.vue'

const parserWorker = new LogParserWorker()

const GAME_VERSION_CONFIG = {
  // 零式首周开始时间
  RAID_START_TIME: '2026-01-06T16:00',
  // 零式装备/道具系列的关键词
  RAID_SERIES_KEYWORD: '总冠军',
}

interface DBConfig {
  key: string
  value: any
}

const dbRecords = useIndexedDB<LootRecord>('loot-history-records')
const dbConfig = useIndexedDB<DBConfig>('loot-history-config')
const dbHandle = useIndexedDB<{
  key: string
  handle: FileSystemDirectoryHandle
}>('loot-history-handle')

const isInitializing = ref(true)
const isLoading = ref(false)
const loadingProgress = ref(0)
const lootRecords = ref<LootRecord[]>([])
const existingKeys = ref(new Set<string>())
const blacklistedKeys = ref(new Set<string>())
const itemVisibility = ref<Record<string, boolean>>({})
const viewMode = ref<'list' | 'summary' | 'slot' | 'week' | 'chart' | 'bis'>(
  'summary',
)
const currentHandle = ref<FileSystemDirectoryHandle | null>(null)

const showTimeSetup = ref(false)
const showRoleDialog = ref(false)

const playerVisibility = ref<Record<string, boolean>>({})
const recordWeekCorrections = ref<Record<string, number>>({})
const bisConfig = ref<BisConfig>({ playerBis: {} })

// 排序模式：'part' (部位排序) | 'drop' (掉落排序)
const summarySortMode = ref<'part' | 'drop'>('part')
const slotSortMode = ref<'part' | 'drop'>('part')
const weekSortMode = ref<'part' | 'drop'>('drop')
const bisSortMode = ref<'part' | 'drop'>('part')

const playerMapping = ref<Record<string, string>>({})

function getActualPlayer(name: string): string {
  if (!playerMapping.value) return name
  return playerMapping.value[name] || name
}

const selectionForMerge = ref<string[]>([])
function handlePlayerSelectForMerge(p: string) {
  if (selectionForMerge.value.includes(p)) {
    selectionForMerge.value = selectionForMerge.value.filter((x) => x !== p)
  } else {
    if (selectionForMerge.value.length >= 2) selectionForMerge.value.shift()
    selectionForMerge.value.push(p)
  }
}

function confirmMergeSelection() {
  if (selectionForMerge.value.length === 2) {
    addMapping(selectionForMerge.value[0], selectionForMerge.value[1])
    selectionForMerge.value = []
  }
}

function addMapping(from?: string, to?: string) {
  if (from && to) {
    playerMapping.value = { ...playerMapping.value, [from]: to }
    return
  }
}

function removeMapping(key: string) {
  const newMap = { ...playerMapping.value }
  delete newMap[key]
  playerMapping.value = newMap
}

const currentPage = ref(1)
const pageSize = 50

const logPath = ref('')
const fullLogPath = ref('')
const isSyncing = ref(false)
const processedFiles = ref<Record<string, { size: number; mtime: number }>>({})
const syncStartDate = ref(GAME_VERSION_CONFIG.RAID_START_TIME)
const syncEndDate = ref<string | null>(null)
const isRaidFilterActive = ref(false)
const isOnlyRaidMembersActive = ref(false)
const EQUIP_ROLES = [
  '御敌',
  '制敌',
  '精准',
  '治愈',
  '强攻',
  '强袭',
  '游击',
  '咏咒',
]
const EQUIP_ROLES_STR = EQUIP_ROLES.join('|')
const RAID_REGEX = new RegExp(
  `(武器箱|${GAME_VERSION_CONFIG.RAID_SERIES_KEYWORD}(?!${EQUIP_ROLES_STR})|规格神典石|强化药|硬化药|强化纤维|神典石)`,
)
const EQUIP_SERIES_REGEX = new RegExp(`(?<series>.+)(${EQUIP_ROLES_STR}).+`)
const showOnlyRole = ref(false)
const hideUnselectedItems = ref(false)
const hideUnselectedPlayers = ref(false)
const systemFilterSettings = ref({
  cards: true,
  materia: true,
  music: true,
  book: true,
  totem: true,
  other: true,
  maskedSeries: [] as string[],
})
const playerRoles = ref<Record<string, string>>({})

watch(
  [
    itemVisibility,
    playerVisibility,
    logPath,
    processedFiles,
    syncStartDate,
    syncEndDate,
    viewMode,
    isRaidFilterActive,
    bisConfig,
    playerMapping,
    playerRoles,
    showOnlyRole,
    hideUnselectedItems,
    hideUnselectedPlayers,
    systemFilterSettings,
    isOnlyRaidMembersActive,
    recordWeekCorrections,
    summarySortMode,
    slotSortMode,
    weekSortMode,
    bisSortMode,
    blacklistedKeys,
  ],
  async () => {
    await dbConfig.set({
      key: 'itemVisibility',
      value: JSON.parse(JSON.stringify(itemVisibility.value)),
    })
    await dbConfig.set({
      key: 'playerVisibility',
      value: JSON.parse(JSON.stringify(playerVisibility.value)),
    })
    await dbConfig.set({
      key: 'weekCorrections',
      value: JSON.parse(JSON.stringify(recordWeekCorrections.value)),
    })
    await dbConfig.set({ key: 'logPath', value: logPath.value })
    await dbConfig.set({
      key: 'processedFiles',
      value: JSON.parse(JSON.stringify(processedFiles.value)),
    })
    await dbConfig.set({ key: 'syncStartDate', value: syncStartDate.value })
    await dbConfig.set({ key: 'syncEndDate', value: syncEndDate.value })
    await dbConfig.set({ key: 'viewMode', value: viewMode.value })
    await dbConfig.set({
      key: 'isRaidFilterActive',
      value: isRaidFilterActive.value,
    })
    await dbConfig.set({
      key: 'bisConfig',
      value: JSON.parse(JSON.stringify(bisConfig.value)),
    })
    await dbConfig.set({
      key: 'hideUnselectedItems',
      value: hideUnselectedItems.value,
    })
    await dbConfig.set({
      key: 'hideUnselectedPlayers',
      value: hideUnselectedPlayers.value,
    })
    await dbConfig.set({
      key: 'playerMapping',
      value: JSON.parse(JSON.stringify(playerMapping.value)),
    })
    await dbConfig.set({
      key: 'playerRoles',
      value: JSON.parse(JSON.stringify(playerRoles.value)),
    })
    await dbConfig.set({ key: 'showOnlyRole', value: showOnlyRole.value })
    await dbConfig.set({
      key: 'isOnlyRaidMembersActive',
      value: isOnlyRaidMembersActive.value,
    })
    await dbConfig.set({
      key: 'systemFilterSettings',
      value: JSON.parse(JSON.stringify(systemFilterSettings.value)),
    })
    await dbConfig.set({ key: 'summarySortMode', value: summarySortMode.value })
    await dbConfig.set({ key: 'slotSortMode', value: slotSortMode.value })
    await dbConfig.set({ key: 'weekSortMode', value: weekSortMode.value })
    await dbConfig.set({ key: 'bisSortMode', value: bisSortMode.value })
    await dbConfig.set({
      key: 'blacklistedKeys',
      value: Array.from(blacklistedKeys.value),
    })
  },
  { deep: true },
)

onMounted(async () => {
  isInitializing.value = true
  try {
    const records = await dbRecords.getAll()

    let hasMigration = false
    const cleanRecords = records.map((r) => {
      const cleanItem = sanitizeItemName(r.item)
      const cleanPlayer = sanitizePlayerName(r.player)
      const cleanRolls = r.rolls.map((roll: RollInfo) => ({
        ...roll,
        player: sanitizePlayerName(roll.player),
      }))
      const isDirty =
        cleanItem !== r.item ||
        cleanPlayer !== r.player ||
        JSON.stringify(cleanRolls) !== JSON.stringify(r.rolls)
      if (isDirty) hasMigration = true
      return {
        ...r,
        item: cleanItem,
        player: cleanPlayer,
        rolls: cleanRolls,
        timestamp: new Date(r.timestamp),
      }
    })

    if (hasMigration) {
      await dbRecords.bulkSet(JSON.parse(JSON.stringify(cleanRecords)))
    }

    lootRecords.value = cleanRecords
    cleanRecords.forEach((r) => existingKeys.value.add(r.key))

    const configs = await dbConfig.getAll()
    configs.forEach((c) => {
      if (c.key === 'itemVisibility') itemVisibility.value = c.value
      if (c.key === 'playerVisibility') playerVisibility.value = c.value
      if (c.key === 'logPath') logPath.value = c.value
      if (c.key === 'processedFiles') processedFiles.value = c.value || {}
      if (c.key === 'weekCorrections')
        recordWeekCorrections.value = c.value || {}
      if (c.key === 'syncStartDate' && c.value) syncStartDate.value = c.value
      if (c.key === 'syncEndDate') syncEndDate.value = c.value || null
      if (
        c.key === 'viewMode' &&
        (c.value === 'list' ||
          c.value === 'summary' ||
          c.value === 'slot' ||
          c.value === 'week' ||
          c.value === 'chart' ||
          c.value === 'bis')
      )
        viewMode.value = c.value
      if (c.key === 'hideUnselectedItems') hideUnselectedItems.value = !!c.value
      if (c.key === 'hideUnselectedPlayers')
        hideUnselectedPlayers.value = !!c.value
      if (c.key === 'playerMapping') playerMapping.value = c.value || {}
      if (c.key === 'playerRoles') playerRoles.value = c.value || {}
      if (c.key === 'showOnlyRole') showOnlyRole.value = !!c.value
      if (c.key === 'systemFilterSettings' && c.value) {
        systemFilterSettings.value = {
          ...systemFilterSettings.value,
          ...c.value,
        }
      }
      if (c.key === 'isRaidFilterActive') isRaidFilterActive.value = !!c.value
      if (c.key === 'isOnlyRaidMembersActive')
        isOnlyRaidMembersActive.value = !!c.value
      if (c.key === 'summarySortMode') summarySortMode.value = c.value || 'part'
      if (c.key === 'slotSortMode') slotSortMode.value = c.value || 'part'
      if (c.key === 'weekSortMode') weekSortMode.value = c.value || 'drop'
      if (c.key === 'bisSortMode') bisSortMode.value = c.value || 'part'
      if (c.key === 'blacklistedKeys')
        blacklistedKeys.value = new Set(c.value || [])
      if (c.key === 'bisConfig') bisConfig.value = c.value || { playerBis: {} }
    })

    const handleEntry = await dbHandle.get('current-log-dir')
    if (handleEntry && handleEntry.handle) {
      currentHandle.value = handleEntry.handle
      fullLogPath.value = handleEntry.handle.name
      const status = await (
        handleEntry.handle as unknown as {
          queryPermission: (o: { mode: string }) => Promise<string>
        }
      ).queryPermission({ mode: 'read' })
      if (status !== 'granted') {
        logPath.value = '未授权，请点击同步按钮'
      }
    }
    window.addEventListener('paste', handleGlobalPaste)
    document.body.addEventListener('dragover', handleGlobalDragOver)
    document.body.addEventListener('dragleave', handleGlobalDragLeave)
    document.body.addEventListener('drop', handleGlobalDrop)
    window.addEventListener('click', closeContextMenu)
  } catch (e) {
    console.error('Failed to load DB:', e)
  } finally {
    isInitializing.value = false
  }
})

const isDragOverWindow = ref(false)
const isDragOverZone = ref(false)
let dragLeaveTimer: any = null

function handleGlobalDragOver(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()

  // 仅在拖拽的是文件时触发（避免拖拽文字时触发）
  // 注意：出于安全限制，浏览器在 Drop 之前无法获取具体文件名，因此无法精确判断是否为 .json
  if (!e.dataTransfer?.types.includes('Files')) return

  isDragOverWindow.value = true
  if (dragLeaveTimer) {
    clearTimeout(dragLeaveTimer)
    dragLeaveTimer = null
  }
}

function handleGlobalDragLeave(e: DragEvent) {
  e.preventDefault()
  if (dragLeaveTimer) clearTimeout(dragLeaveTimer)
  dragLeaveTimer = setTimeout(() => {
    isDragOverWindow.value = false
    isDragOverZone.value = false
  }, 100)
}

function handleGlobalDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragOverWindow.value = false
  isDragOverZone.value = false
  if (dragLeaveTimer) {
    clearTimeout(dragLeaveTimer)
    dragLeaveTimer = null
  }

  if (e.dataTransfer && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.json')) {
      processImportFile(file)
    }
  }
}

function handleZoneDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragOverWindow.value = false
  isDragOverZone.value = false
  if (dragLeaveTimer) {
    clearTimeout(dragLeaveTimer)
    dragLeaveTimer = null
  }

  if (e.dataTransfer && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.json')) {
      processImportFile(file)
    }
  }
}

async function handleGlobalPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text')
  if (!text) return

  try {
    if (!text.trim().startsWith('{')) return
    const json = JSON.parse(text)
    if (json.r && Array.isArray(json.r)) {
      e.preventDefault()
      await processImportJSON(json)
    }
  } catch (_err) {
    // ignore
  }
}

onUnmounted(() => {
  window.removeEventListener('paste', handleGlobalPaste)
  document.body.removeEventListener('dragover', handleGlobalDragOver)
  document.body.removeEventListener('dragleave', handleGlobalDragLeave)
  document.body.removeEventListener('drop', handleGlobalDrop)
  window.removeEventListener('click', closeContextMenu)
  parserWorker.terminate()
})

function closeContextMenu() {
  isMenuVisible.value = false
}

const playerNetwork = computed(() => {
  const networks = new Map<string, Set<string>>()
  lootRecords.value.forEach((record) => {
    const party = new Set([record.player, ...record.rolls.map((r) => r.player)])
    party.forEach((p) => {
      if (!networks.has(p)) networks.set(p, new Set())
      const myFriends = networks.get(p)!
      party.forEach((mate) => {
        if (mate !== p) myFriends.add(mate)
      })
    })
  })
  return networks
})

const mergeSuggestions = computed(() => {
  const suggestions: { from: string; to: string; confidence: number }[] = []
  const ps = Array.from(playerNetwork.value.keys())

  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const p1 = ps[i] as string,
        p2 = ps[j] as string

      if (getActualPlayer(p1) === getActualPlayer(p2)) continue

      const net1 = playerNetwork.value.get(p1)!,
        net2 = playerNetwork.value.get(p2)!
      if (net1.size < 3 || net2.size < 3) continue

      const intersection = new Set([...net1].filter((x) => net2.has(x)))
      const union = new Set([...net1, ...net2])
      const jaccard = intersection.size / union.size

      if (jaccard > 0.9) {
        suggestions.push({
          from: p1,
          to: p2,
          confidence: Math.round(jaccard * 100),
        })
      }
    }
  }
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
})

const allPlayers = computed(() => {
  const players = new Set<string>()
  lootRecords.value.forEach((record) => {
    players.add(getActualPlayer(record.player))
    record.rolls.forEach((roll) => players.add(getActualPlayer(roll.player)))
  })
  return Array.from(players).sort(comparePlayersByRole)
})
const availableSeries = computed(() => {
  const seriesSet = new Set<string>()
  lootRecords.value.forEach((r) => {
    if (RAID_REGEX.test(r.item)) return
    const match = r.item.match(EQUIP_SERIES_REGEX)
    if (match?.groups?.series) {
      seriesSet.add(match.groups.series)
    }
  })
  return Array.from(seriesSet).sort()
})
const assignedPlayers = computed(() => {
  return new Set(Object.values(playerRoles.value))
})
const isRaidRolesComplete = computed(() => {
  return ROLE_DEFINITIONS.every((role) => !!playerRoles.value[role])
})

const selectablePlayersForMerge = computed(() => {
  const players = new Set<string>()
  lootRecords.value.forEach((record) => {
    players.add(getActualPlayer(record.player))
  })

  const originalPlayers = new Set<string>()
  lootRecords.value.forEach((r) => {
    originalPlayers.add(r.player)
    r.rolls.forEach((roll) => originalPlayers.add(roll.player))
  })

  const mappedAliases = new Set(Object.keys(playerMapping.value))

  return Array.from(originalPlayers)
    .filter((p) => {
      if (mappedAliases.has(p)) return false
      const actual = getActualPlayer(p)
      return isPlayerChecked(actual)
    })
    .sort()
})

const sortedSummaryPlayers = computed(() => {
  return Object.keys(playerSummary.value).sort(comparePlayersByRole)
})

const visibleAllPlayers = computed(() => {
  if (!hideUnselectedPlayers.value) return allPlayers.value
  return allPlayers.value.filter((p) => isPlayerChecked(p))
})

const visibleUniqueItems = computed(() => {
  if (!hideUnselectedItems.value) return uniqueItems.value
  return uniqueItems.value.filter(isItemChecked)
})

const uniqueItems = computed(() => {
  const items = new Set(
    lootRecords.value
      .filter((r) => !isSystemFiltered(r.item))
      .map((r) => r.item),
  )
  return Array.from(items).sort((a, b) => {
    const pa = getItemSortPriority(a)
    const pb = getItemSortPriority(b)
    if (pa !== pb) return pa - pb
    return a.localeCompare(b)
  })
})

watch(
  [isRaidFilterActive, uniqueItems],
  ([active]) => {
    if (active) {
      selectRaidLoot()
      hideUnselectedItems.value = true
    } else {
      hideUnselectedItems.value = false
    }
  },
  { immediate: true },
)

watch(
  [isOnlyRaidMembersActive, playerRoles, allPlayers],
  () => {
    if (isOnlyRaidMembersActive.value) {
      const newPV: Record<string, boolean> = {}
      allPlayers.value.forEach((p) => {
        newPV[p] = !!getPlayerRole(p)
      })
      playerVisibility.value = newPV
      hideUnselectedPlayers.value = true
    } else {
      hideUnselectedPlayers.value = false
    }
  },
  { deep: true, immediate: true },
)

watch(isRaidRolesComplete, (newVal) => {
  if (!newVal && isOnlyRaidMembersActive.value) {
    isOnlyRaidMembersActive.value = false
  }
})

import { PART_ORDER, DROP_ORDER } from '@/utils/lootParser'

const SLOT_DEFINITIONS = PART_ORDER

function getItemSortPriority(
  item: string,
  mode: 'part' | 'drop' = 'part',
): number {
  const order = mode === 'part' ? PART_ORDER : DROP_ORDER
  const index = order.findIndex((def) => item.includes(def))
  if (index !== -1) return index
  if (RAID_REGEX.test(item)) return 50
  return 100
}

const itemWinnerMap = computed(() => {
  const map = new Map<string, Set<string>>()
  lootRecords.value.forEach((r) => {
    if (!map.has(r.item)) map.set(r.item, new Set())
    map.get(r.item)!.add(getActualPlayer(r.player))
  })
  return map
})

const playerItemMap = computed(() => {
  const map = new Map<string, Set<string>>()
  lootRecords.value.forEach((r) => {
    const p = getActualPlayer(r.player)
    if (!map.has(p)) map.set(p, new Set())
    map.get(p)!.add(r.item)
  })
  return map
})

const visibleItemCount = computed(() => {
  return uniqueItems.value.filter((i) => isItemChecked(i)).length
})

const visiblePlayerCount = computed(() => {
  return allPlayers.value.filter((p) => isPlayerChecked(p)).length
})

const filteredRecords = computed(() => {
  const result = lootRecords.value.filter((record) => {
    if (isSystemFiltered(record.item)) return false

    if (playerVisibility.value[getActualPlayer(record.player)] === false)
      return false

    if (itemVisibility.value[record.item] === false) return false

    const ts = record.timestamp.getTime()
    if (ts < new Date(syncStartDate.value).getTime()) return false
    if (syncEndDate.value && ts > new Date(syncEndDate.value).getTime())
      return false

    return true
  })
  return result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
})

const playerSummary = computed(() => {
  const summary: Record<string, Record<string, number>> = {}
  filteredRecords.value.forEach((record) => {
    const p = getActualPlayer(record.player)
    const i = record.item
    if (!summary[p]) summary[p] = {}
    if (!summary[p][i]) summary[p][i] = 0
    summary[p][i]++
  })
  return summary
})

function getItemSlot(itemName: string): string {
  const def = SLOT_DEFINITIONS.find((d) => itemName.includes(d))
  return def || '其他'
}

const slotSummary = computed(() => {
  const summary: Record<string, Record<string, number>> = {}
  SLOT_DEFINITIONS.forEach((s) => {
    summary[s] = {}
  })

  filteredRecords.value.forEach((record) => {
    let slot = getItemSlot(record.item)

    if (slot === '其他') {
      slot = record.item
    }

    if (!summary[slot]) summary[slot] = {}
    const currentSlot = summary[slot]!

    const p = getActualPlayer(record.player)

    if (!currentSlot[p]) currentSlot[p] = 0
    currentSlot[p]++
  })
  return summary
})

const displaySlots = computed(() => {
  const predefined = (
    slotSortMode.value === 'part' ? PART_ORDER : DROP_ORDER
  ).filter(
    (s) => slotSummary.value[s] && Object.keys(slotSummary.value[s]).length > 0,
  )
  const dynamic = Object.keys(slotSummary.value)
    .filter(
      (k) =>
        !(PART_ORDER as unknown as string[]).includes(k) &&
        !(DROP_ORDER as unknown as string[]).includes(k),
    )
    .sort((a, b) => {
      const getCount = (key: string) =>
        Object.values(slotSummary.value[key] || {}).reduce(
          (sum, c) => sum + c,
          0,
        )
      const ca = getCount(a)
      const cb = getCount(b)
      if (ca !== cb) return cb - ca
      return a.localeCompare(b)
    })

  return [...predefined, ...dynamic]
})

import {
  getRaidWeekStart,
  getRaidWeekLabel as getRaidWeekLabelUtil,
  getFormattedWeekLabel as getFormattedWeekLabelUtil,
} from '@/utils/raidWeekUtils'

function getRawRaidWeekNum(dateInput: Date | string) {
  const date = new Date(dateInput)
  const start = new Date(GAME_VERSION_CONFIG.RAID_START_TIME).getTime()
  const weekStart = getRaidWeekStart(date).getTime()
  const diff = weekStart - start
  return Math.max(1, Math.round(diff / (7 * 24 * 60 * 60 * 1000)) + 1)
}

function getRaidWeekLabel(record: LootRecord) {
  const offset = recordWeekCorrections.value[record.key] || 0
  return getRaidWeekLabelUtil(record.timestamp, offset).label
}

const zeroWeekStart = computed(() => {
  return getRaidWeekStart(new Date(syncStartDate.value))
})

function getFormattedWeekLabel(weekRangeLabel: string) {
  const { label } = getFormattedWeekLabelUtil(
    weekRangeLabel,
    zeroWeekStart.value,
  )
  return label
}

function toggleWeekCorrection(record: LootRecord) {
  const current = recordWeekCorrections.value[record.key] || 0
  const newMap = { ...recordWeekCorrections.value }

  if (current < 0) {
    delete newMap[record.key]
  } else {
    newMap[record.key] = -1
  }
  recordWeekCorrections.value = newMap
}

const weekSummary = computed(() => {
  const summary: Record<string, Record<string, LootRecord[]>> = {}
  filteredRecords.value.forEach((r) => {
    const week = getRaidWeekLabel(r)
    if (!summary[week]) summary[week] = {}
    const p = getActualPlayer(r.player)
    if (!summary[week][p]) summary[week][p] = []
    summary[week][p].push(r)
  })

  for (const week in summary) {
    for (const player in summary[week]) {
      const records = summary[week][player]
      if (records) {
        records.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      }
    }
  }
  return summary
})

const rawSuspiciousKeys = computed(() => {
  const keys = new Set<string>()
  // 按照原始时间（不考虑手动偏移）进行周汇总
  const rawSummary: Record<string, LootRecord[]> = {}
  filteredRecords.value.forEach((r) => {
    const date = new Date(r.timestamp)
    const weekStart = getRaidWeekStart(date)
    const weekLabel = `${weekStart.toLocaleDateString()} - ${new Date(
      weekStart.getTime() + 6 * 24 * 60 * 60 * 1000,
    ).toLocaleDateString()}`
    if (!rawSummary[weekLabel]) rawSummary[weekLabel] = []
    rawSummary[weekLabel].push(r)
  })

  for (const week in rawSummary) {
    const allRecords = rawSummary[week]!
    const itemsMap: Record<string, LootRecord[]> = {}
    allRecords.forEach((r) => {
      if (!itemsMap[r.item]) itemsMap[r.item] = []
      itemsMap[r.item]?.push(r)
    })

    const anchorTimestamps: number[] = []
    for (const itemName in itemsMap) {
      const itemRecords = itemsMap[itemName]!
      if (itemRecords.length > 1) {
        itemRecords.sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        )
        for (let i = 0; i < itemRecords.length - 1; i++) {
          const recA = itemRecords[i]!
          const recB = itemRecords[i + 1]!
          if (
            recB.timestamp.getTime() - recA.timestamp.getTime() >
            5 * 60 * 1000
          ) {
            anchorTimestamps.push(recA.timestamp.getTime())
          }
        }
      }
    }

    allRecords.forEach((r) => {
      const ts = r.timestamp.getTime()
      if (anchorTimestamps.some((ats) => Math.abs(ts - ats) <= 5 * 60 * 1000)) {
        keys.add(r.key)
      }
    })
  }
  return keys
})

const sortedWeeks = computed(() => {
  return Object.keys(weekSummary.value).sort().reverse()
})

function getSortedRecordsInWeek(weekName: string): LootRecord[] {
  const playersMap = weekSummary.value[weekName]
  if (!playersMap) return []
  const all: LootRecord[] = []
  Object.values(playersMap).forEach((recs) => {
    all.push(...recs)
  })

  return all.sort((a, b) => {
    // 1. 按照部位优先级
    const pA = getItemSortPriority(a.item, weekSortMode.value)
    const pB = getItemSortPriority(b.item, weekSortMode.value)
    if (pA !== pB) return pA - pB

    // 2. 部位相同时，按照职能顺序 (MT-D4)
    const roleCompare = comparePlayersByRole(a.player, b.player)
    if (roleCompare !== 0) return roleCompare

    // 3. 职能相同时，按照时间顺序
    return a.timestamp.getTime() - b.timestamp.getTime()
  })
}

function getItemGroupId(itemName: string): number {
  const p = getItemSortPriority(itemName, weekSortMode.value)
  if (weekSortMode.value === 'drop') {
    if (p <= 3) return 1 // 首饰组 (0-3: 耳, 颈, 腕, 指环)
    if (p <= 8) return 2 // 小件组 (4-8: 头, 手, 脚, 神典石, 硬化药)
    if (p <= 12) return 3 // 大件组 (9-12: 身, 腿, 强化药, 强化纤维)
    return 4 // 武器与其它组 (13+)
  } else {
    // 部位排序下的分组逻辑 (可选，或者在部位排序下不显示分割线)
    if (p === 0) return 1 // 武器
    if (p <= 5) return 2 // 左侧防具
    if (p <= 9) return 3 // 首饰
    return 4 // 材料
  }
}

function shouldShowWeekDivider(records: LootRecord[], index: number): boolean {
  if (index >= records.length - 1) return false
  const current = records[index]
  const next = records[index + 1]
  if (!current || !next) return false

  const currentGroup = getItemGroupId(current.item)
  const nextGroup = getItemGroupId(next.item)
  return currentGroup !== nextGroup
}

const contextMenuRecord = ref<LootRecord | null>(null)
const isMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })

// 虚拟引用对象，提供给 Popover 用于定位
const contextMenuRef = {
  getBoundingClientRect: () =>
    ({
      width: 0,
      height: 0,
      top: contextMenuPosition.value.y,
      bottom: contextMenuPosition.value.y,
      left: contextMenuPosition.value.x,
      right: contextMenuPosition.value.x,
    }) as DOMRect,
}

function handleRecordTrigger(e: MouseEvent, record: LootRecord) {
  e.preventDefault()
  e.stopPropagation()
  contextMenuRecord.value = record
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  isMenuVisible.value = true
}

function handleCorrectionClick() {
  if (contextMenuRecord.value) {
    toggleWeekCorrection(contextMenuRecord.value)
  }
  isMenuVisible.value = false
}

const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredRecords.value.slice(start, start + pageSize)
})

function resetFilters() {
  itemVisibility.value = {}
  playerVisibility.value = {}
  isRaidFilterActive.value = false
  syncStartDate.value =
    zeroWeekStart.value?.toISOString().slice(0, 16) ||
    GAME_VERSION_CONFIG.RAID_START_TIME
  syncEndDate.value = null
}

function handleSyncDateChange() {
  if (currentHandle.value && !isSyncing.value) {
    syncLogFiles()
  }
}

async function setLogPath() {
  try {
    const showPicker = (
      window as unknown as {
        showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
      }
    ).showDirectoryPicker
    if (!showPicker) {
      ElMessageBox.alert('你的浏览器不支持此功能', '错误', {
        confirmButtonText: '确定',
        type: 'error',
      })
      return
    }
    const handle = await showPicker()
    if (handle) {
      await dbRecords.clear()
      await dbConfig.set({ key: 'processedFiles', value: {} })
      processedFiles.value = {}
      lootRecords.value = []
      existingKeys.value.clear()
      itemVisibility.value = {}
      playerVisibility.value = {}

      await dbHandle.set({ key: 'current-log-dir', handle })
      currentHandle.value = handle
      logPath.value = handle.name
      fullLogPath.value = handle.name
      showTimeSetup.value = true
    }
  } catch (e: any) {
    if (e.name !== 'AbortError') console.error('Directory picker error:', e)
  }
}

async function deleteRecord(record: LootRecord) {
  try {
    // 1. 从内存中删除
    const index = lootRecords.value.findIndex((r) => r.key === record.key)
    if (index !== -1) {
      lootRecords.value.splice(index, 1)
    }

    // 2. 从数据库中删除
    await dbRecords.remove(record.key)

    // 3. 从现有 key 集合中删除
    existingKeys.value.delete(record.key)

    // 4. 加入黑名单（防止以后再解析回来）
    blacklistedKeys.value.add(record.key)

    ElMessage.success('记录已永久删除')
  } catch (err) {
    console.error('Delete error:', err)
    ElMessage.error('删除失败')
  }
}

async function startInitialSync() {
  showTimeSetup.value = false
  await syncLogFiles()
}

async function syncLogFiles() {
  if (isSyncing.value || !currentHandle.value) return

  interface FileSystemDirectoryHandleExtended {
    queryPermission(options: {
      mode: string
    }): Promise<'granted' | 'denied' | 'prompt'>
    requestPermission(options: {
      mode: string
    }): Promise<'granted' | 'denied' | 'prompt'>
    values(): AsyncIterableIterator<FileSystemHandle>
  }
  const handle =
    currentHandle.value as unknown as FileSystemDirectoryHandleExtended

  const status = await handle.queryPermission({ mode: 'read' })
  if (status !== 'granted') {
    const newStatus = await handle.requestPermission({ mode: 'read' })
    if (newStatus !== 'granted') return
  }

  isSyncing.value = true
  isLoading.value = true
  loadingProgress.value = 0

  try {
    const todayStr = getTodayPattern()
    const syncStartTs = new Date(syncStartDate.value).getTime()
    const syncEndTs = syncEndDate.value
      ? new Date(syncEndDate.value).getTime()
      : Infinity
    const filesToRead: { handle: FileSystemFileHandle; name: string }[] = []

    const isFirstSync = existingKeys.value.size === 0
    const localKeys = new Set(existingKeys.value)
    const allNewRecords: LootRecord[] = []
    const batchSeenPlayers = new Set<string>()
    const batchSeenItems = new Set<string>()

    for await (const entry of handle.values()) {
      if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.log')) {
        const name = entry.name
        const file = await (entry as FileSystemFileHandle).getFile()
        if (name.includes(todayStr)) {
          filesToRead.push({ handle: entry as FileSystemFileHandle, name })
          continue
        }
        const match = name.match(/_(\d{8})(?:\.|_)/)
        if (match && match[1]) {
          const fileDateStr = `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)} 00:00:00`
          const fileTs = new Date(fileDateStr).getTime()
          if (fileTs + 86400000 < syncStartTs) continue
          if (fileTs > syncEndTs) continue
        } else {
          if (file.lastModified < syncStartTs || file.lastModified > syncEndTs)
            continue
        }
        if (
          !processedFiles.value[name] &&
          Date.now() - file.lastModified < 60 * 24 * 3600 * 1000
        ) {
          filesToRead.push({ handle: entry as FileSystemFileHandle, name })
        }
      }
    }

    if (filesToRead.length === 0) {
      isSyncing.value = false
      isLoading.value = false
      return
    }

    for (let i = 0; i < filesToRead.length; i++) {
      const target = filesToRead[i]!
      const file = await target.handle.getFile()
      const text = await file.text()

      const {
        records,
        players: filePlayers,
        items: fileItems,
      } = await parseLogWithWorker(text)

      for (const r of records) {
        if (!localKeys.has(r.key) && !blacklistedKeys.value.has(r.key)) {
          localKeys.add(r.key)
          allNewRecords.push(r)
        }
      }

      filePlayers.forEach((p) => batchSeenPlayers.add(p))
      fileItems.forEach((i) => batchSeenItems.add(i))

      if (!target.name.includes(todayStr)) {
        processedFiles.value[target.name] = {
          size: file.size,
          mtime: file.lastModified,
        }
      }
      loadingProgress.value = Math.round(((i + 1) / filesToRead.length) * 100)
    }

    if (allNewRecords.length > 0) {
      await dbRecords.bulkSet(JSON.parse(JSON.stringify(allNewRecords)))

      lootRecords.value.push(...allNewRecords)
      existingKeys.value = localKeys

      let visUpdated = false
      const newIV = { ...itemVisibility.value }
      const newPV = { ...playerVisibility.value }

      batchSeenItems.forEach((i) => {
        if (newIV[i] === undefined) {
          newIV[i] = true
          visUpdated = true
        }
      })
      batchSeenPlayers.forEach((p) => {
        if (newPV[p] === undefined) {
          newPV[p] = true
          visUpdated = true
        }
      })

      if (visUpdated) {
        itemVisibility.value = newIV
        playerVisibility.value = newPV
      }

      if (!isFirstSync) {
        ElMessage.success({
          message: `同步完成，新增 ${allNewRecords.length} 条记录`,
          showClose: true,
        })
      }
    }

    logPath.value = currentHandle.value.name
  } catch (err: any) {
    console.error('Sync error:', err.message)
  } finally {
    isSyncing.value = false
    isLoading.value = false
    loadingProgress.value = 0
  }
}

function getTodayPattern() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

function parseLogWithWorker(text: string): Promise<{
  records: LootRecord[]
  players: string[]
  items: string[]
}> {
  return new Promise((resolve, reject) => {
    parserWorker.onmessage = (e) => {
      resolve(e.data)
    }
    parserWorker.onerror = (e) => {
      reject(e)
    }
    parserWorker.postMessage(text)
  })
}

function isSystemFiltered(item: string) {
  if (systemFilterSettings.value.cards && item.startsWith('九宫幻卡'))
    return true
  if (systemFilterSettings.value.materia && item.includes('魔晶石')) return true
  if (
    systemFilterSettings.value.music &&
    (item.startsWith('管弦乐琴乐谱') || item.startsWith('陈旧的乐谱'))
  )
    return true
  if (systemFilterSettings.value.book && item.endsWith('断章')) return true
  if (systemFilterSettings.value.totem && item.endsWith('图腾')) return true
  if (
    systemFilterSettings.value.other &&
    (item.includes('经验值') || item.includes('金币'))
  )
    return true

  if (!RAID_REGEX.test(item)) {
    const match = item.match(EQUIP_SERIES_REGEX)
    if (
      match?.groups?.series &&
      systemFilterSettings.value.maskedSeries?.includes(match.groups.series)
    ) {
      return true
    }
  }
  return false
}

function isItemChecked(item: string) {
  const baseVisible = isRaidFilterActive.value
    ? RAID_REGEX.test(item)
    : itemVisibility.value[item] !== false
  if (!baseVisible) return false

  if (RAID_REGEX.test(item)) return true

  const winners = itemWinnerMap.value.get(item)
  if (winners) {
    const anyWinnerVisible = Array.from(winners).some(
      (p) => playerVisibility.value[p] !== false,
    )
    if (!anyWinnerVisible) return false
  }
  return true
}

function isPlayerChecked(p: string) {
  if (playerVisibility.value[p] === false) return false

  if (getPlayerRole(p)) return true

  const items = playerItemMap.value.get(p)
  if (!items) return false
  return Array.from(items).some((itemName) => {
    if (isSystemFiltered(itemName)) return false
    return isRaidFilterActive.value
      ? RAID_REGEX.test(itemName)
      : itemVisibility.value[itemName] !== false
  })
}

function isItemAutoDisabled(item: string) {
  if (isItemChecked(item)) return false
  return itemVisibility.value[item] !== false
}

function isPlayerAutoDisabled(p: string) {
  if (getPlayerRole(p)) return false

  const items = playerItemMap.value.get(p)
  if (!items) return true

  const hasVisibleItems = Array.from(items).some((itemName) => {
    if (isSystemFiltered(itemName)) return false
    return itemVisibility.value[itemName] !== false
  })

  if (!hasVisibleItems) return true

  return false
}

function handleItemClick(e: MouseEvent, item: string) {
  if (e.ctrlKey) {
    copyToClipboard(item)
    return
  }
  if (e.altKey) {
    toggleSoloMode('item', item)
    return
  }
  if (isRaidFilterActive.value) {
    return
  }
  toggleItemVisibility(item)
}

function toggleItemVisibility(item: string) {
  const currentVisible = itemVisibility.value[item] !== false
  const nextVisible = !currentVisible
  itemVisibility.value[item] = nextVisible

  if (nextVisible) {
    const winners = itemWinnerMap.value.get(item)
    if (winners) {
      winners.forEach((p) => {
        if (playerVisibility.value[p] === false) {
          playerVisibility.value[p] = true
        }
      })
    }
  }
}

function addSpecialRole(p: string, type: 'SUB' | 'LEFT') {
  if (!p) return
  const exists = Object.entries(playerRoles.value).some(
    ([role, name]) => role.startsWith(type + ':') && name === p,
  )
  if (exists) return

  let index = 1
  let roleKey = `${type}:${index}`
  while (playerRoles.value[roleKey]) {
    index++
    roleKey = `${type}:${index}`
  }
  playerRoles.value[roleKey] = p
}

function comparePlayersByRole(a: string, b: string) {
  const roleA = getPlayerRole(a)
  const roleB = getPlayerRole(b)

  const getRolePriority = (r: string | null | undefined) => {
    if (!r) return 999
    if (ROLE_DEFINITIONS.includes(r as any))
      return ROLE_DEFINITIONS.indexOf(r as any)
    if (r.startsWith('SUB:')) return 100
    if (r.startsWith('LEFT:')) return 200
    return 500
  }

  const pA = getRolePriority(roleA)
  const pB = getRolePriority(roleB)

  if (pA !== pB) return pA - pB

  return a.localeCompare(b)
}

function getSortedPlayersInSlot(summary: Record<string, number>) {
  if (!summary) return []
  return Object.keys(summary).sort(comparePlayersByRole)
}

function getSortedItemsInPlayerSummary(playerName: string) {
  const itemsInSummary = playerSummary.value[playerName] || {}
  return Object.keys(itemsInSummary).sort((a, b) => {
    return (
      getItemSortPriority(a, summarySortMode.value) -
      getItemSortPriority(b, summarySortMode.value)
    )
  })
}

function getPlayerRole(player: string) {
  for (const [role, pName] of Object.entries(playerRoles.value)) {
    if (pName === player) return role
  }
  return undefined
}

function handlePlayerClick(e: MouseEvent, p: string) {
  if (e.ctrlKey) {
    copyToClipboard(p)
    return
  }
  if (e.altKey) {
    toggleSoloMode('player', p)
    return
  }
  if (isOnlyRaidMembersActive.value) {
    return
  }
  togglePlayerVisibility(p)
}

function togglePlayerVisibility(player: string) {
  playerVisibility.value[player] = !(playerVisibility.value[player] !== false)
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success({
      message: `已复制: ${text}`,
      duration: 1500,
      showClose: true,
    })
  } catch (err) {
    console.error('Copy failed', err)
    ElMessage.error({ message: '复制失败', showClose: true })
  }
}

function toggleAllPlayers(visible: boolean) {
  allPlayers.value.forEach((p) => (playerVisibility.value[p] = visible))
}

function selectRaidLoot() {
  const newIV: Record<string, boolean> = {}
  uniqueItems.value.forEach((item) => {
    newIV[item] = RAID_REGEX.test(item)
  })
  itemVisibility.value = newIV

  if (visiblePlayerCount.value === 0) {
    toggleAllPlayers(true)
  }
}

const showManualAddDialog = ref(false)
const manualForm = ref({
  timestamp: '',
  item: '',
  player: '',
})

function openManualAddDialog() {
  manualForm.value = {
    timestamp: new Date().toISOString(),
    item: '',
    player: '',
  }
  showManualAddDialog.value = true
}

function querySearchItems(qs: string, cb: any) {
  const all = Array.from(uniqueItems.value)
  const candidates = all.filter((i) =>
    i.toLowerCase().includes(qs.toLowerCase()),
  )
  cb(candidates.map((v) => ({ value: v })))
}

function querySearchPlayers(qs: string, cb: any) {
  const candidates = allPlayers.value.filter((p) =>
    p.toLowerCase().includes(qs.toLowerCase()),
  )
  cb(candidates.map((v) => ({ value: v })))
}

async function submitManualRecord() {
  const item = manualForm.value.item.trim()
  const player = manualForm.value.player.trim()

  if (!manualForm.value.timestamp || !item || !player) {
    ElMessage.error('请填写完整信息')
    return
  }

  const isNewItem = !uniqueItems.value.includes(item)
  const isNewPlayer = !allPlayers.value.includes(player)

  if (isNewItem || isNewPlayer) {
    let warningMsg = ''
    if (isNewItem && isNewPlayer) {
      warningMsg = `物品 "<b>${item}</b>" 和 玩家 "<b>${player}</b>" 都是第一次出现。`
    } else if (isNewItem) {
      warningMsg = `物品 "<b>${item}</b>" 是第一次出现。`
    } else {
      warningMsg = `玩家 "<b>${player}</b>" 是第一次出现。`
    }

    try {
      await ElMessageBox.confirm(
        `${warningMsg}<br/><br/>确定要以此名称创建记录吗？请检查是否有错别字。`,
        '发现新条目',
        {
          confirmButtonText: '确定创建',
          cancelButtonText: '返回修改',
          type: 'warning',
          dangerouslyUseHTMLString: true,
        },
      )
    } catch {
      return
    }
  }

  const ts = new Date(manualForm.value.timestamp)
  const key = `manual-${ts.getTime()}-${Math.random().toString(36).slice(2)}`

  const record: LootRecord = {
    key,
    timestamp: ts,
    item,
    player,
    rolls: [],
    isManual: true,
  }

  await dbRecords.set(JSON.parse(JSON.stringify(record)))

  lootRecords.value.push(record)
  if (itemVisibility.value[record.item] === undefined) {
    itemVisibility.value[record.item] = true
  }
  if (playerVisibility.value[getActualPlayer(record.player)] === undefined) {
    playerVisibility.value[getActualPlayer(record.player)] = true
  }

  showManualAddDialog.value = false
  ElMessage.success({
    message: `已添加: ${record.item} - ${record.player}`,
    showClose: true,
  })
}

const importInputRef = ref<HTMLInputElement | null>(null)

function handleDataCommand(command: string) {
  if (command === 'clear') {
    ElMessageBox.confirm('确定清空所有记录？此操作不可恢复。', '警告', {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      type: 'warning',
    })
      .then(() => {
        clearDatabase()
      })
      .catch(() => {})
  } else if (command === 'export') {
    exportData()
  } else if (command === 'import') {
    importInputRef.value?.click()
  } else if (command === 'manual') {
    openManualAddDialog()
  }
}

function exportData() {
  try {
    const uniqueItems = new Set<string>()
    const uniquePlayers = new Set<string>()
    let minTs = Date.now()

    lootRecords.value.forEach((rec) => {
      uniqueItems.add(rec.item)
      uniquePlayers.add(rec.player)
      const t =
        rec.timestamp instanceof Date ? rec.timestamp.getTime() : rec.timestamp
      if (t < minTs) minTs = t
      if (rec.rolls) {
        rec.rolls.forEach((r) => uniquePlayers.add(r.player))
      }
    })

    const itemDict = Array.from(uniqueItems)
    const playerDict = Array.from(uniquePlayers)
    const itemMap = new Map(itemDict.map((item, idx) => [item, idx]))
    const playerMap = new Map(playerDict.map((player, idx) => [player, idx]))

    const ROLL_TYPES = ['need', 'greed', 'assign', 'direct', 'manual']
    const rollTypeMap = new Map(ROLL_TYPES.map((t, i) => [t, i]))

    const data = {
      v: 4,
      base: minTs,
      dicts: {
        i: itemDict,
        p: playerDict,
      },
      r: lootRecords.value.map((rec) => {
        const t =
          rec.timestamp instanceof Date
            ? rec.timestamp.getTime()
            : rec.timestamp

        const row: any[] = [
          t - minTs,
          itemMap.get(rec.item),
          playerMap.get(rec.player),
          rec.key,
        ]

        if (rec.rolls && rec.rolls.length > 0) {
          row.push(rec.rolls.length)
          rec.rolls.forEach((r) => {
            row.push(playerMap.get(r.player))
            row.push(r.value)
            row.push(rollTypeMap.get(r.type) ?? 0)
          })
        } else {
          row.push(0)
        }
        return row
      }),
      c: {
        map: playerMapping.value,
        roles: playerRoles.value,
        filter: systemFilterSettings.value,
        raidActive: isOnlyRaidMembersActive.value,
      },
    }

    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ff14_loot_backup_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    ElMessage.success({ message: '数据已导出', showClose: true })
  } catch (e) {
    console.error(e)
    ElMessage.error({ message: '导出失败', showClose: true })
  }
}

async function processImportJSON(json: any) {
  try {
    if (!json.r || !Array.isArray(json.r)) {
      ElMessage.error({ message: '无效的备份文件格式', showClose: true })
      return
    }

    const recordCount = json.r.length
    await ElMessageBox.confirm(
      `准备导入 ${recordCount} 条记录。导入将合并到现有数据中(相同记录会被跳过)。是否继续？`,
      '导入数据',
      {
        confirmButtonText: '开始导入',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    const loading = ElMessage({
      message: '正在导入数据...',
      duration: 0,
      type: 'info',
      showClose: true,
    })

    if (json.c) {
      if (json.c.map)
        playerMapping.value = { ...playerMapping.value, ...json.c.map }
      if (json.c.roles)
        playerRoles.value = { ...playerRoles.value, ...json.c.roles }
      if (json.c.filter) {
        systemFilterSettings.value = {
          ...systemFilterSettings.value,
          ...json.c.filter,
        }
      }
      if (json.c.raidActive !== undefined)
        isOnlyRaidMembersActive.value = json.c.raidActive
    }

    const existingSigs = new Set(
      lootRecords.value.map(
        (r) => `${new Date(r.timestamp).getTime()}|${r.item}|${r.player}`,
      ),
    )
    const currentKeys = new Set(lootRecords.value.map((r) => r.key))

    const newRecords: LootRecord[] = []
    const baseTs = json.base || 0
    const itemDict = json.dicts?.i || []
    const playerDict = json.dicts?.p || []
    const ROLL_TYPES = ['need', 'greed', 'assign', 'direct', 'manual']

    for (const rec of json.r) {
      const ts = baseTs + rec[0]
      const item = itemDict[rec[1]]
      const player = playerDict[rec[2]]

      const key = rec[3]

      const rCount = rec[4]

      const rolls = [] as any[]
      if (rCount > 0) {
        let cursor = 5
        for (let i = 0; i < rCount; i++) {
          if (cursor + 2 >= rec.length) break
          rolls.push({
            player: playerDict[rec[cursor]],
            value: rec[cursor + 1],
            type: ROLL_TYPES[rec[cursor + 2]] || 'need',
          })
          cursor += 3
        }
      }

      if (!item || !player) continue

      const recordKey =
        key && typeof key === 'string'
          ? key
          : `${ts}_${item}_${player}_${Math.random().toString(36).slice(2)}`

      if (currentKeys.has(recordKey) || blacklistedKeys.value.has(recordKey))
        continue

      const sig = `${ts}|${item}|${player}`
      if (!existingSigs.has(sig)) {
        newRecords.push({
          key: recordKey,
          timestamp: new Date(ts),
          item,
          player,
          rolls,
          source: 'import',
          id: '',
        } as LootRecord)
        existingSigs.add(sig)
        currentKeys.add(recordKey)
      }
    }

    if (newRecords.length > 0) {
      await dbRecords.bulkSet(JSON.parse(JSON.stringify(newRecords)))
      lootRecords.value = [...lootRecords.value, ...newRecords].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      newRecords.forEach((r) => currentKeys.add(r.key))
      existingKeys.value = new Set(lootRecords.value.map((r) => r.key))
      ElMessage.success({
        message: `成功导入 ${newRecords.length} 条新记录`,
        showClose: true,
      })
    } else {
      ElMessage.info({
        message: '未发现新记录，所有数据已存在',
        showClose: true,
      })
    }
    loading.close()
  } catch (_err) {
    if (_err !== 'cancel') {
      console.error(_err)
      ElMessage.error({ message: '导入出错', showClose: true })
    }
  }
}

function processImportFile(file: File) {
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const json = JSON.parse(e.target?.result as string)
      await processImportJSON(json)
    } catch (e) {
      console.error(e)
      ElMessage.error({ message: '文件解析失败', showClose: true })
    }
  }
  reader.readAsText(file)
}

function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  processImportFile(input.files[0]!)
  input.value = ''
}

const soloState = ref<{
  type: 'item' | 'player'
  key: string
  snapshot: Record<string, boolean>
} | null>(null)

function toggleSoloMode(type: 'item' | 'player', key: string) {
  const isItem = type === 'item'
  const visibility = isItem ? itemVisibility : playerVisibility
  const list = isItem ? uniqueItems : allPlayers

  if (soloState.value?.type === type && soloState.value.key === key) {
    visibility.value = { ...soloState.value.snapshot }
    soloState.value = null
    ElMessage.info({
      message: '已恢复到独显前的状态',
      duration: 2000,
      showClose: true,
    })
    return
  }

  let baseState = visibility.value
  if (soloState.value?.type === type) {
    baseState = soloState.value.snapshot
  }

  soloState.value = {
    type,
    key,
    snapshot: JSON.parse(JSON.stringify(baseState)),
  }

  const newVisibility: Record<string, boolean> = {}
  list.value.forEach((k) => {
    newVisibility[k] = k === key
  })
  visibility.value = newVisibility

  ElMessage.success({
    message: `仅显示: ${key} (再次 Alt+点击 恢复)`,
    duration: 2000,
  })
}

function formatTime(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${date.getFullYear()}/${m}/${d} ${hh}:${mm}`
}

function getWinnerRoll(record: LootRecord) {
  return record.rolls.find((r) => r.player === record.player)
}
function getWinnerRollInfo(record: LootRecord): RollInfo | null {
  const roll = getWinnerRoll(record)
  if (roll) return roll

  if (record.player) {
    const type: RollInfo['type'] = record.isManual
      ? 'manual'
      : record.isAssign
        ? 'assign'
        : 'direct'
    return {
      player: record.player,
      type,
      value: null,
    }
  }
  return null
}
function getOtherRolls(record: LootRecord): RollInfo[] {
  return record.rolls
    .filter((r) => r.player !== record.player)
    .sort((a, b) => {
      const typePriority = { need: 0, greed: 1 } as const
      const typeA = typePriority[a.type as keyof typeof typePriority] ?? 3
      const typeB = typePriority[b.type as keyof typeof typePriority] ?? 3
      if (typeA !== typeB) return typeA - typeB
      return (b.value || 0) - (a.value || 0)
    })
}

async function clearDatabase() {
  await dbRecords.clear()
  lootRecords.value = []
  existingKeys.value.clear()
  processedFiles.value = {}
  ElMessage.success({ message: '数据库已清空', showClose: true })
}
</script>

<style lang="scss">
:root {
  --ffxiv-stripe-color: rgba(0, 0, 0, 0.08);
  --ffxiv-diagonal-texture: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 12px,
    var(--ffxiv-stripe-color) 12px,
    var(--ffxiv-stripe-color) 24px
  );
}

html, body {
  
  overflow-y: overlay; 
  background-color: #f8fafc !important;
  color-scheme: light;
  margin: 0;
  
  padding: 0 !important; 
}

html.dark, html.dark body {
  background-color: #161823 !important;
  color-scheme: dark;
  --ffxiv-stripe-color: rgba(255, 255, 255, 0.08);
}


::-webkit-scrollbar {
  width: 10px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border: 2px solid transparent;
  background-clip: padding-box;
  border-radius: 5px;
}
html.dark ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}

.ffxiv-diagonal-bg {
  background-image: var(--ffxiv-diagonal-texture);
}

.ffxiv-diagonal-mask {
  position: relative !important;
  
  user-select: none !important;
  -webkit-user-select: none !important;
  -webkit-user-drag: none !important;
  -webkit-touch-callout: none !important;
  cursor: not-allowed !important;

  &::after {
    content: '' !important;
    position: absolute !important;
    inset: 0 !important;
    z-index: var(
      --ffxiv-mask-z,
      9999
    ) !important; 
    background: var(--ffxiv-mask-bg, transparent) !important;
    background-image: var(--ffxiv-diagonal-texture) !important;
    pointer-events: auto !important; 
    cursor: not-allowed !important;
  }

  
  * {
    pointer-events: none !important;
    user-select: none !important;
    -webkit-user-drag: none !important;
    -webkit-user-select: none !important;
  }
}

.section-mask {
  position: absolute;
  inset: 0;
  z-index: 100;
  cursor: not-allowed !important;
  user-select: none !important;
  -webkit-user-drag: none !important;
  pointer-events: auto !important; 
  --mask-overlay: linear-gradient(
    rgba(255, 255, 255, 0.2),
    rgba(255, 255, 255, 0.4)
  );

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 10;
    pointer-events: none; 
    background: var(--mask-overlay);
    background-image: var(--ffxiv-diagonal-texture);
  }
}

html.dark .section-mask {
  --mask-overlay: linear-gradient(
    rgba(22, 24, 35, 0.8),
    rgba(22, 24, 35, 0.95)
  );
}

.path-toolbar {
  .date-picker-el,
  .range-sep {
    transform: translateY(-1.5px) !important;
  }
}
</style>

<style lang="scss" scoped>
.app-container {
  min-height: 100vh;
  background-color: #f8fafc;
  font-family:
    'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  color: #1e293b;
  display: flex;
  flex-direction: column;
}

.is-onboarding {
  max-height: 100vh;
  overflow: hidden;
}

.app-header {
  height: 48px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  padding: 0 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}
.brand-container {
  width: 100%;
  max-width: 1400px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand h1 {
  font-size: 20px;
  font-weight: 800;
  background: linear-gradient(135deg, #1e293b 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  flex-shrink: 0;
}
.version-tag {
  background: #eff6ff;
  color: #3b82f6;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  border: 1px solid #dbeafe;
}

.path-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 4px;
  border-radius: 6px;
  flex-shrink: 0;
  height: 32px;
  box-sizing: border-box;
}
.tool-btn {
  height: 28px !important;
  padding: 0 8px !important;
  border: none !important;
  background: transparent !important;
  font-size: 13px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.tool-btn :deep(i) {
  font-size: 14px;
}
.tool-btn:hover {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.08) !important;
}
.tool-btn.el-button--danger:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.05) !important;
}
.v-divider {
  width: 1px;
  height: 20px;
  background: #e2e8f0;
  margin: 0 4px;
}
.path-toolbar :deep(.el-button) {
  height: 28px !important;
  margin: 0 !important;
  padding: 0 10px !important;
  font-weight: 600;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  line-height: 0 !important;
}
.path-toolbar :deep(.el-input__wrapper) {
  height: 28px !important;
  background: #f8fafc;
  box-shadow: 0 0 0 1px #e2e8f0 inset !important;
  padding: 0 8px !important;
  box-sizing: border-box !important;
  display: flex;
  align-items: center;
}
.path-toolbar :deep(.el-input__wrapper):hover {
  box-shadow: 0 0 0 1px #cbd5e1 inset !important;
  background: #f1f5f9;
}
.path-toolbar :deep(.el-input__wrapper).is-focus {
  box-shadow:
    0 0 0 1px #3b82f6 inset,
    0 0 0 3px rgba(59, 130, 246, 0.1) !important;
  background: white;
}
.path-toolbar :deep(.el-input__inner) {
  font-size: 12px;
  color: #1e293b;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  padding: 0 !important;
  padding-left: 24px !important;
  height: 28px !important;
  line-height: 28px !important;
  border: none !important;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  white-space: nowrap;
}
.header-right :deep(.el-switch__label) {
  white-space: nowrap;
}

.control-bar {
  margin: 0 auto 12px;
  width: calc(100% - 48px);
  max-width: 1400px;
  padding: 0;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.filter-panel {
  width: calc(100% - 48px);
  max-width: 1400px;
  margin: 0 auto 12px;
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  overflow: hidden;
}

.sec-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  padding: 8px 8px;
  background: white;
  border-bottom: 1px solid #f1f5f9;
}

.sec-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.title-main {
  font-size: 14px;
  color: #1e293b;
}

.hint-small {
  font-size: 10px;
  color: #94a3b8;
  font-weight: normal;
}

.hint-action {
  font-size: 11px;
  color: #64748b;
  font-weight: normal;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
}

.header-sep {
  width: 1px;
  height: 14px;
  background-color: #cbd5e1;
  margin: 0 4px;
}

.switch-box {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}
.switch-label {
  font-size: 12px;
  font-weight: normal;
  color: #475569;
}

.sec-header .acts {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.act-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.act-divider {
  width: 1px;
  height: 16px;
  background: #e2e8f0;
}

.soft-action-btn {
  background-color: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
  color: #64748b !important;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.soft-action-btn .el-icon {
  font-size: 14px;
}

.el-button.soft-action-btn {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.soft-action-btn .el-icon {
  font-size: 14px;
}

.el-button.soft-action-btn:hover {
  background-color: #f1f5f9;
  border-color: #cbd5e1;
  color: #1e293b;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.el-button.soft-action-btn:active {
  background-color: #e2e8f0;
}

.el-button.soft-action-btn.primary {
  font-weight: 600;
  color: #334155;
}

.help-link {
  color: #94a3b8 !important;
  font-weight: normal !important;
}
.help-link:hover {
  color: #3b82f6 !important;
}

.sec-body {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 8px;
  max-height: 160px;
  overflow-y: auto;
  align-content: flex-start;
  background: #fdfdfd;
  position: relative;
}

.mask-content {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  padding: 10px 20px;
  border-radius: 24px;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.05),
    0 4px 6px -2px rgba(0, 0, 0, 0.02),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 10px;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  user-select: none;
  border: 1px solid rgba(255, 255, 255, 0.8);
  animation: premium-float 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes premium-float {
  from {
    transform: translateY(12px) scale(0.98);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
.mini-tag-el {
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}
.el-check-tag.player-tag {
  height: 24px;
  line-height: 22px;
  padding: 0 8px;
  font-size: 12px;
}
.el-check-tag.player-tag.readonly-tag {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}
.el-check-tag.player-tag.readonly-tag:hover {
  background-color: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-text-color-regular);
  transform: none;
}
.el-check-tag.player-tag.readonly-tag.is-checked {
  opacity: 1;
}
.el-check-tag.player-tag.readonly-tag.is-checked:hover {
  background-color: var(--el-color-primary);
  color: white;
  transform: none;
}
.el-check-tag.item-tag {
  height: 22px;
  line-height: 20px;
  padding: 0 4px;
  font-size: 11px;
}
.el-check-tag.item-tag.readonly-tag {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}
.el-check-tag.item-tag.readonly-tag:hover {
  background-color: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-text-color-regular);
  transform: none;
}
.el-check-tag.item-tag.readonly-tag.is-checked {
  opacity: 1;
}
.el-check-tag.item-tag.readonly-tag.is-checked:hover {
  background-color: var(--el-color-primary);
  color: white;
  transform: none;
}
.popover-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 280px;
  max-width: 100%;
  box-sizing: border-box;
}

.merge-selector-box {
  margin-bottom: 8px;
  width: 100%;
}
.selector-title {
  font-size: 11px;
  font-weight: 800;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.selector-tags {
  scrollbar-gutter: stable;
  margin-bottom: 12px;
  padding: 8px;
  background: white;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  box-sizing: border-box;
  width: 100%;
  max-height: 260px;
  overflow-y: auto;
  overflow-x: hidden;

  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  align-content: start;
}

.selector-tags :deep(.el-check-tag) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 32px;
  padding: 0 4px;
  font-size: 13px;
  font-weight: normal;
  box-sizing: border-box;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
  border-radius: 4px;
}

.selector-tags::-webkit-scrollbar {
  width: 4px;
}
.selector-tags::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.selector-tags :deep(.mini-tag-el) {
  margin: 0 !important;
  display: inline-flex !important;
  justify-content: center;
  align-items: center;
  width: 100% !important;
  height: 24px;
  padding: 0 4px;
  box-sizing: border-box;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
}
.selector-tags :deep(.el-check-tag__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.role-config-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.role-config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: bold;
}
.role-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.role-label {
  width: 30px;
  font-weight: bold;
  font-size: 12px;
  text-align: right;
}
.confirm-merge-btn {
  width: 100%;
}

.context-menu {
  position: fixed;
  background: white;
  border: 1px solid var(--border-light);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  z-index: 9999;
  padding: 4px 0;
  min-width: 130px;
}
.context-menu-header {
  padding: 8px 16px;
  font-size: 11px;
  background: #f8fafc;
  color: #64748b;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 4px;
}
.context-menu-item {
  padding: 6px 16px;
  font-size: 13px;
  cursor: pointer;
  color: #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.context-menu-item:hover {
  background: #f1f5f9;
  color: var(--primary-color);
}
.context-menu-item.current-role {
  background-color: #eff6ff;
  color: var(--primary-color);
  font-weight: bold;
}
.context-menu-item.current-role:hover {
  background-color: #dbeafe;
}
.context-menu-item.danger {
  color: #ef4444;
}
.context-menu-item.danger:hover {
  background: #fef2f2;
}
.divider {
  height: 1px;
  background: var(--border-light);
  margin: 4px 0;
}
.check-mark {
  font-size: 10px;
}

.suggestion-box {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  padding: 10px;
}
.suggest-title {
  font-size: 10px;
  color: #b45309;
  font-weight: 800;
  margin-bottom: 6px;
}
.suggest-item {
  font-size: 11px;
  color: #92400e;
  padding: 6px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s;
}
.suggest-item:hover {
  background: #fef3c7;
}
.suggest-item b {
  color: #d97706;
}

.mapping-list {
  margin-top: 8px;
  border-top: 1px solid var(--border-light);
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 150px;
  overflow-y: auto;
}
.mapping-list-title {
  font-size: 10px;
  font-weight: 800;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}
.mapping-tag {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-light);
  font-size: 11px;
  color: var(--text-secondary);
}
.mapping-tag span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-container-el {
  width: 100%;
  margin: 0;
  background: white;
  border-radius: 0 0 12px 12px;
  border-top: none;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}
:deep(.loot-cell) {
  padding: 4px 0 !important;
}
:deep(.el-table__header) {
  margin: 0 !important;
}
:deep(.el-table__row) {
  transition: background-color 0.2s;
}

.col-time {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.time-date {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  font-family: inherit;
  font-variant-numeric: tabular-nums;
}

.col-week {
  font-size: 11px;
  color: #64748b;
  font-weight: 800;
  font-family: inherit;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.col-item {
  padding-right: 16px;
  overflow: hidden;
}
.item-text {
  font-weight: 800;
  font-size: 11px;
  color: #334155;
  white-space: nowrap;
  text-overflow: ellipsis;
  display: block;
  overflow: hidden;
}

.type-direct {
  color: #64748b;
}
.winner-badge.badge-direct {
  background: #f1f5f9;
  border-color: #e2e8f0;
  color: #475569;
}
.winner-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.winner-val {
  background: rgba(0, 0, 0, 0.05);
  padding: 0 4px;
  border-radius: 4px;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    'Courier New', monospace;
}
.no-winner {
  color: #cbd5e1;
  font-style: italic;
  font-size: 11px;
}
.week-list-body {
  padding: 4px 0;
}

.week-list-divider {
  height: 1px;
  border-top: 1px dashed #e2e8f0;
  margin: 4px 12px;
}

.week-record-row {
  margin: 0 !important;
  padding: 6px 12px !important;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex !important;
  align-items: center;
  justify-content: space-between;
}

.week-record-row:last-child {
  border-bottom: none;
}

.week-record-row:hover {
  background-color: #f8fafc;
}

.week-row-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.week-item-name {
  font-size: 13px;
  color: #334155;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.week-row-aside {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-right: 12px;
  width: 105px;
  justify-content: flex-start;
  transition: width 0.2s ease;
}

.is-compact-role .week-row-aside {
  width: 32px;
}

.week-player-name {
  font-size: 12px;
  color: #475569;
  font-weight: 600;
}

.week-record-row.is-suspicious {
  background-color: #fff7ed;
}
.week-record-row.is-suspicious:hover {
  background-color: #ffedd5;
}
.week-record-row.is-suspicious .week-item-name {
  color: #c2410c;
  font-weight: 700;
}

.week-record-row.is-corrected {
  background-color: #eff6ff;
}
.week-record-row.is-corrected:hover {
  background-color: #dbeafe;
}
.week-record-row.is-corrected .week-item-name {
  color: #1e40af;
  font-weight: 700;
}

.row-status-icon {
  font-size: 14px;
}
.row-status-icon.is-warning {
  color: #f97316;
}
.row-status-icon.is-info {
  color: #3b82f6;
}
@keyframes suspicious-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(249, 115, 22, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(249, 115, 22, 0);
  }
}
.mini-item-tag:hover {
  border-color: #3b82f6;
  background-color: #f0f9ff;
  color: #3b82f6;
}

.mode-tabs-el :deep(.el-tab-pane) {
  background: white;
  border: 1px solid #e2e8f0;
  border-top: none;
  border-radius: 0 0 12px 12px;
  box-sizing: border-box;
}

.context-menu-popper {
  padding: 0 !important;
  border-radius: 12px !important;
  box-shadow:
    0 10px 25px -5px rgba(0, 0, 0, 0.1),
    0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid rgba(226, 232, 240, 0.8) !important;
  backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.95) !important;
  overflow: hidden;
}

.custom-context-menu {
  display: flex;
  flex-direction: column;
}

.menu-info-header {
  padding: 10px 14px;
  font-size: 11px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f8fafc;
}

.menu-divider {
  height: 1px;
  background: #f1f5f9;
}

.menu-action-item {
  padding: 10px 14px;
  font-size: 13px;
  color: #1e293b;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background 0.2s ease;
  margin: 4px;
  border-radius: 8px;
  white-space: nowrap;
}

.action-arrow {
  color: #3b82f6;
  font-size: 16px !important;
  flex-shrink: 0;
}

.action-label {
  flex: 1;
}

.menu-action-item:hover {
  background: #f1f5f9;
  color: #3b82f6;
}

.menu-action-item .el-icon {
  font-size: 16px;
}

.col-rolls {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
.mr-player {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.no-rolls-hint {
  font-size: 11px;
  color: #cbd5e1;
  font-style: italic;
}

.tabs-sort-control {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
}

.menu-action-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.menu-action-item:hover {
  background-color: #f5f5f5;
}

.action-arrow {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.action-label {
  flex: 1;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  width: 100%;
  margin: 0;
  padding: 16px;
  background: white;
  border-top: none;
  border-radius: 0 0 12px 12px;
  box-sizing: border-box;
}

.summary-grid.has-sort-control {
  padding-top: 48px;
}

.summary-grid.slot-grid {
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
}
.summary-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
}
.summary-card:hover {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 2px 4px -1px rgba(0, 0, 0, 0.03);
  border-color: #cbd5e1;
}
.summary-header {
  padding: 0 8px;
  height: 32px;
  display: flex;
  align-items: center;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 800;
  color: #334155;
  font-size: 13px;
  position: sticky;
  top: 0;
  z-index: 10;
}
.summary-item {
  padding: 6px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  border-bottom: 1px solid #f8fafc;
}
.s-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #334155;
  font-weight: 500;
}
.summary-item:last-child {
  border-bottom: none;
}
.count-badge {
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
}
.count-single {
  background: #f8fafc;
  color: #94a3b8;
  border: 1px solid #f1f5f9;
}

.count-many {
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fee2e2;
}

.pagination-el-container {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.pagination-box {
  padding: 12px 16px;
  display: flex;
  align-items: center;
}

.initial-loading {
  position: fixed;
  inset: 0;
  background: #f8fafc;
  z-index: 5000;
  display: flex;
  justify-content: center;
  align-items: center;
}
.loading-card {
  background: white;
  padding: 48px;
  border-radius: 20px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
  text-align: center;
  border: 1px solid #e2e8f0;
}
.spinner-large {
  width: 40px;
  height: 40px;
  border: 4px solid #f1f5f9;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  z-index: 999;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(4px);
}
.spinner {
  width: 32px;
  height: 32px;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}
.loading-txt {
  font-weight: 700;
  color: #1e293b;
}

.empty-state {
  text-align: center;
  padding: 80px 0;
  color: #94a3b8;
}
.empty-icon {
  font-size: 64px;
  margin-bottom: 24px;
  opacity: 0.2;
}
.hint-txt {
  font-size: 13px;
  color: #94a3b8;
  margin: 6px 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-leave-to {
  opacity: 0;
}

.filter-popover {
  padding: 4px;
}
.pop-title {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #334155;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 4px;
}
.filter-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.filter-list .el-checkbox {
  height: 24px;
}

.main-viewport {
  width: calc(100% - 48px);
  max-width: 1400px;
  margin: 0 auto 32px;
}

.mode-tabs-el {
  margin-top: 8px;
  padding-top: 6px;
  display: flex;
  flex-direction: column;
}

:deep(.el-tabs__header) {
  margin: 0 !important;
  border-bottom: none !important;
  padding: 0 !important;
  overflow: visible !important;
}

:deep(.el-tabs__nav-wrap) {
  overflow: visible !important;
  padding-left: 0 !important;
}

:deep(.el-tabs__nav-scroll) {
  overflow: visible !important;
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__nav) {
  border: none !important;
}

.mode-tabs-el :deep(.el-tabs__header .el-tabs__item) {
  border: 1px solid #e2e8f0 !important;
  background: #f8fafc !important;
  margin-right: -1px !important;
  transition: all 0.2s ease;
  color: #64748b;
  height: 40px;
  line-height: 40px;
  border-radius: 0 !important;
  box-sizing: border-box;
  margin-bottom: -1px;
}

.mode-tabs-el :deep(.el-tabs__header .el-tabs__item:first-child) {
  border-top-left-radius: 8px !important;
  margin-left: 0 !important;
}

.mode-tabs-el :deep(.el-tabs__header .el-tabs__item:last-child) {
  border-top-right-radius: 8px !important;
}

.mode-tabs-el :deep(.el-tabs__header .el-tabs__item.is-active) {
  background: white !important;
  color: var(--primary-color) !important;
  font-weight: 800;
  border-bottom-color: white !important;
  position: relative;
  z-index: 5;
}

.summary-grid,
.list-container-el {
  position: relative;
  z-index: 1;
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item:not(.is-active):hover) {
  background: #f1f5f9;
  color: #475569;
}

.empty-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  transition: padding 0.2s ease-out;
}

.empty-guide-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
  width: 100%;
  max-width: 1200px;
}

.empty-info-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

@media (max-height: 750px) {
  .empty-placeholder {
    padding: 20px;
  }
  .empty-title {
    font-size: 26px;
    margin-bottom: 4px;
  }
  .empty-desc {
    font-size: 15px;
    margin-bottom: 12px;
  }
}

@media (max-height: 580px) {
  .empty-container {
    padding-bottom: 0;
    padding-top: 0;
    align-items: center;
  }
  .empty-placeholder {
    padding: 16px 24px 12px;
  }

  .empty-guide-main {
    flex-direction: row;
    text-align: left;
    align-items: center;
    justify-content: center;
    gap: 40px;
  }

  .empty-info-side {
    flex: 0 1 auto;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .empty-icon {
    display: block !important;
    max-height: 48px;
    opacity: 0.8;
    margin-bottom: 8px;
    overflow: visible;
    pointer-events: auto;
    line-height: 1;
  }

  .guide-img-box {
    margin-left: 0;
    margin-bottom: 0;
  }

  .empty-title {
    font-size: 18px;
  }
  .empty-desc {
    font-size: 13px;
  }

  .setup-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    max-width: 500px;
    padding: 8px;
    gap: 12px;
  }
}

.compact-guide {
  margin-top: 0 !important;
}

.empty-placeholder:hover {
  border-color: #3b82f6;
  background: #fbfcfe;
}

.empty-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  flex: 1;
  box-sizing: border-box;
  background-color: #f8fafc;
}

.empty-title {
  font-size: 32px;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.empty-desc {
  font-size: 18px;
  color: #64748b;
  line-height: 1.8;
  margin-bottom: 16px;
}

.empty-highlight {
  color: #3b82f6;
  font-weight: 700;
  padding: 0 4px;
}

.empty-hint {
  display: flex;
  gap: 16px;
}

.empty-hint :deep(.el-button) {
  padding: 12px 32px;
  font-weight: 600;
  border-radius: 10px;
}

.setup-form {
  background: #f8fafc;
  padding: 20px;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setup-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.setup-label {
  font-weight: 700;
  color: #475569;
  font-size: 14px;
  white-space: nowrap;
}

.setup-row :deep(.el-date-editor) {
  flex: 1;
}

.guide-img-box {
  border-radius: 9.5px;
  overflow: hidden;
  max-width: 500px;
  width: auto;
  flex-shrink: 1;
  background: transparent;
}

.guide-img {
  display: block;
  width: auto;
  max-width: 100%;
  max-height: 58vh;
  height: auto;
  object-fit: contain;
  opacity: 1;
}

@media (max-height: 750px) {
  .guide-img {
    max-height: 48vh;
  }
}

@media (max-height: 580px) {
  .guide-img {
    max-height: 50vh;
    max-width: 320px;
  }
}

.guide-img:hover {
  opacity: 1;
  transition: opacity 0.2s ease;
}

.hint-txt {
  margin-top: 8px;
  color: #94a3b8;
  font-size: 11px;
  width: 100%;
  border-top: 1px solid #f1f5f9;
  padding-top: 8px;
}

.drag-guide-zone {
  position: absolute;
  top: -8px;
  left: -8px;
  right: -8px;
  height: 80px;
  z-index: 9999;
  background-color: rgba(236, 245, 255, 0.95);
  border: 2px dashed #409eff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #409eff;
  font-weight: bold;
  font-size: 16px;
  gap: 4px;
  backdrop-filter: blur(4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  animation: fadeIn 0.2s ease-out;
  transition: all 0.2s ease;
}

.drag-guide-zone.is-active {
  background-color: rgba(217, 236, 255, 0.98);
  border-color: #337ecc;
  transform: scale(1.01);
  box-shadow: 0 12px 32px rgba(64, 158, 255, 0.3);
}

.drag-guide-zone > * {
  pointer-events: none;
}

.setup-drag-zone {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.95);
  border: 2px dashed #409eff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #409eff;
  font-weight: bold;
  font-size: 16px;
  gap: 8px;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;
  transition: all 0.2s ease;
}

.setup-drag-zone.is-active {
  background-color: rgba(236, 245, 255, 0.98);
  border-color: #337ecc;
  transform: scale(1.02);
  box-shadow: 0 12px 32px rgba(64, 158, 255, 0.2);
}

.setup-drag-zone > * {
  pointer-events: none;
}

.guide-icon {
  font-size: 32px;
  margin-bottom: 4px;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 8px 0;
}

.role-setup-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.role-setup-label {
  flex-shrink: 0;
  width: 36px;
  display: flex;
  justify-content: center;
}

.role-divider {
  margin: 24px 0 16px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #e2e8f0;
  font-size: 14px;
  font-weight: 700;
  color: #64748b;
  display: flex;
  align-items: center;
}

.role-divider::before {
  content: '';
  width: 4px;
  height: 14px;
  background: #3b82f6;
  margin-right: 8px;
  border-radius: 2px;
}

.special-role-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.special-role-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-title {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
}

.special-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.special-item {
  display: inline-flex;
}

.loot-record-table :deep(th.el-table__cell) {
  background-color: #f8fafc;
  color: #64748b;
  font-weight: 800;
  font-size: 12px;
}

.role-settings-dialog :deep(.el-dialog__body) {
  padding-top: 10px;
}

.role-settings-dialog :deep(.el-dialog__footer) {
  border-top: 1px solid #f1f5f9;
  padding-top: 20px;
}
</style>

<style lang="scss">
.control-bar {
  margin: 0 auto 12px;
  width: calc(100% - 48px);
  max-width: 1400px;
  padding: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.control-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

html.dark {
  .app-container {
    background-color: #161823;
    color: rgba(255, 255, 255, 0.9);
  }

  .app-header {
    background: rgba(22, 24, 35, 0.85);
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .filter-section,
  .summary-card,
  .list-container-el,
  .initial-loading,
  .summary-grid,
  .setup-form,
  .role-setup-item,
  .suggestion-box,
  .context-menu,
  .selector-tags {
    background-color: #252632;
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .sec-header,
  .summary-header,
  .role-config-header,
  .menu-info-header,
  .context-menu-header {
    background: #252632;
    border-bottom-color: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.9);
  }

  .sec-body,
  .mapping-tag {
    background-color: #161823;
  }

  .mode-tabs-el .el-tab-pane {
    background-color: #252632;
    border-color: rgba(255, 255, 255, 0.08);
  }
  .mode-tabs-el .el-tabs__header .el-tabs__item {
    background-color: #161823 !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
    color: rgba(255, 255, 255, 0.5);
  }
  .mode-tabs-el .el-tabs__header .el-tabs__item.is-active {
    background-color: #252632 !important;
    color: #60a5fa !important;
    border-bottom-color: #252632 !important;
  }

  .summary-item,
  .week-record-row,
  .menu-divider,
  .role-divider,
  .divider,
  .mapping-list {
    border-bottom-color: rgba(255, 255, 255, 0.06);
    border-top-color: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.5);
  }

  .week-record-row:last-child,
  .summary-item:last-child {
    border-bottom: none;
  }

  .s-name,
  .item-text,
  .title-main,
  .week-item-name,
  .week-player-name,
  .setup-label,
  .menu-action-item,
  .context-menu-item,
  .selector-title,
  .switch-label,
  .player-name-text {
    color: rgba(255, 255, 255, 0.9) !important;
  }

  .hint-small,
  .hint-txt,
  .no-rolls-hint,
  .no-winner,
  .time-date,
  .col-week,
  .menu-info-header {
    color: rgba(255, 255, 255, 0.5);
  }

  .soft-action-btn,
  .hint-action {
    background-color: rgba(255, 255, 255, 0.08) !important;
    border-color: transparent !important;
    color: rgba(255, 255, 255, 0.8) !important;
    &:hover {
      background-color: rgba(255, 255, 255, 0.15) !important;
      color: #ffffff !important;
    }
  }

  .path-toolbar .el-input__wrapper {
    background-color: rgba(255, 255, 255, 0.08) !important;
    box-shadow: none !important;
  }
  .path-toolbar .el-input__inner {
    color: rgba(255, 255, 255, 0.9) !important;
    background-color: transparent !important;
  }
  .path-toolbar .el-input__wrapper:hover,
  .path-toolbar .el-input__wrapper.is-focus {
    background-color: rgba(255, 255, 255, 0.12) !important;
  }

  .el-table {
    --el-table-bg-color: #252632;
    --el-table-tr-bg-color: #252632;
    --el-table-header-bg-color: #252632;
    --el-table-border-color: rgba(255, 255, 255, 0.06);
    background-color: #252632;
  }

  .loot-record-table th.el-table__cell {
    background-color: #252632 !important;
    color: rgba(255, 255, 255, 0.7);
    border-bottom-color: rgba(255, 255, 255, 0.06);
  }

  .el-table__row:hover > td {
    background-color: rgba(255, 255, 255, 0.04) !important;
  }

  .week-record-row:hover {
    background-color: rgba(255, 255, 255, 0.06) !important;
  }
  .menu-action-item:hover,
  .summary-card:hover,
  .context-menu-item:hover {
    background-color: rgba(255, 255, 255, 0.06) !important;
  }

  .week-record-row.is-suspicious {
    background-color: rgba(255, 77, 79, 0.15) !important;
    box-shadow: inset 0 0 0 1px rgba(255, 77, 79, 0.2);
    .week-item-name {
      color: #ffabadd9 !important;
    }
  }
  .week-record-row.is-suspicious:hover {
    background-color: rgba(255, 77, 79, 0.2) !important;
  }

  .week-record-row.is-corrected {
    background-color: rgba(94, 129, 244, 0.15) !important;
    box-shadow: inset 0 0 0 1px rgba(94, 129, 244, 0.2);
    .week-item-name {
      color: #8baaffd1 !important;
    }
  }

  .context-menu-popper {
    background: #252632 !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5) !important;
  }
  .pop-title {
    color: rgba(255, 255, 255, 0.9);
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .v-divider,
  .act-divider {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .el-dialog {
    background-color: #252632;
    border-color: rgba(255, 255, 255, 0.1);
    .el-dialog__title {
      color: rgba(255, 255, 255, 0.9);
    }
  }
  .role-settings-dialog .el-dialog__footer {
    border-top-color: rgba(255, 255, 255, 0.08);
  }

  .el-pagination {
    --el-pagination-bg-color: transparent;
    --el-pagination-button-bg-color: rgba(255, 255, 255, 0.08);
    --el-pagination-button-color: rgba(255, 255, 255, 0.5);
    --el-pagination-button-disabled-bg-color: transparent;
    --el-pagination-hover-color: #60a5fa;
  }

  .el-check-tag {
    background-color: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.6);

    &.is-checked {
      background-color: rgba(255, 255, 255, 0.15);
      color: #60a5fa;
      font-weight: 600;
    }

    &:not(.is-checked):hover {
      background-color: rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.9);
    }

    &:not(.is-checked) {
      --el-tag-bg-color: rgba(255, 255, 255, 0.08);
      --el-tag-text-color: rgba(255, 255, 255, 0.6);
      --el-tag-border-color: transparent;
    }
  }

  .el-checkbox__label {
    color: rgba(255, 255, 255, 0.9);
  }

  .loading-txt {
    color: rgba(255, 255, 255, 0.7);
  }

  .stats-panel {
    background-color: #161823 !important;
  }

  .chart-container {
    background-color: #252632 !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }

  .chart-title {
    color: rgba(255, 255, 255, 0.9) !important;
  }

  .chart-subtitle {
    color: rgba(255, 255, 255, 0.5) !important;
  }

  .bis-view-panel,
  .bis-config-panel {
    background-color: #252632 !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }

  .bis-table th,
  .sticky-col {
    background-color: #252632 !important;
    color: rgba(255, 255, 255, 0.9) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }

  .bis-table td {
    border-color: rgba(255, 255, 255, 0.08) !important;
    color: rgba(255, 255, 255, 0.9) !important;
  }

  .status-need {
    background-color: rgba(16, 185, 129, 0.2) !important;
    color: #34d399 !important;
  }

  .status-greed {
    background-color: rgba(245, 158, 11, 0.15) !important;
    color: #fbbf24 !important;
  }

  .status-greed-tome {
    background-color: rgba(56, 189, 248, 0.15) !important;
    color: #38bdf8 !important;
  }

  .status-pass {
    background-color: rgba(255, 255, 255, 0.02) !important;
    color: rgba(255, 255, 255, 0.3) !important;
  }

  .config-table .check-cell:hover {
    background-color: rgba(255, 255, 255, 0.05) !important;
  }
}
</style>
