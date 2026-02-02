#!/bin/bash
# 自动更新 cactbot 子模块并应用 patch

set -e

PATCH_FILE="patches/0001-cactbot-all.patch"

echo "更新 cactbot 子模块..."

cd cactbot

# 重置子模块状态
# echo "重置子模块状态..."
git reset --hard HEAD > /dev/null

# 切换到 main 分支
git checkout main > /dev/null 2>&1

# 拉取最新代码
echo "拉取最新代码..."
git pull origin main

# 应用 patch
if [ -f ../$PATCH_FILE ] && [ -s ../$PATCH_FILE ]; then
    echo "应用 patch..."
    cd ..
    if git apply $PATCH_FILE; then
        echo "Patch 应用成功"
    else
        echo "Patch 应用失败"
        exit 1
    fi
    cd cactbot
else
    echo "未找到 patch"
fi

cd ..

# 更新主仓库的子模块引用
CACTBOT_COMMIT=$(cd cactbot && git rev-parse HEAD)
git update-index --cacheinfo 160000,$CACTBOT_COMMIT,cactbot

if git diff --cached --quiet; then
    echo "子模块无变更"
else
    echo "子模块已更新: $CACTBOT_COMMIT"
    echo "请提交变更: git commit -m 'chore: update cactbot submodule'"
fi

echo "完成"
