class Vector2 {
  x: number
  y: number

  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }

  add(vector: Vector2): Vector2 {
    return new Vector2(this.x + vector.x, this.y + vector.y)
  }

  subtract(vector: Vector2): Vector2 {
    return new Vector2(this.x - vector.x, this.y - vector.y)
  }

  divide(scalar: number): Vector2 {
    return new Vector2(this.x / scalar, this.y / scalar)
  }

  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar)
  }

  static get One(): Vector2 {
    return new Vector2(1, 1)
  }
}

// 将世界坐标转换为 2D 地图纹理坐标（以像素为单位）
function getPixelCoordinates(worldXZCoordinates: Vector2, mapOffset: Vector2, mapSizeFactor: number): Vector2 {
  const offsetVector = worldXZCoordinates.add(mapOffset)
  const scaledVector = offsetVector.divide(100).multiply(mapSizeFactor)
  const finalVector = scaledVector.add(new Vector2(1024, 1024))
  return finalVector
}

// 将 2D 地图纹理坐标（以像素为单位）转换为世界坐标
function getWorldCoordinates(pixelCoordinates: Vector2, mapOffset: Vector2, mapSizeFactor: number): Vector2 {
  const adjustedVector = pixelCoordinates.subtract(new Vector2(1024, 1024))
  const scaledVector = adjustedVector.divide(mapSizeFactor)
  const finalVector = scaledVector.multiply(100).subtract(mapOffset)
  return finalVector
}

// 将地图纹理像素坐标转换为游戏内 2D 地图坐标
function getGameMapCoordinates(mapPixelCoordinates: Vector2, mapSizeFactor: number): Vector2 {
  return mapPixelCoordinates.divide(mapSizeFactor).multiply(2).add(Vector2.One)
}

// 将世界坐标转换为游戏内 2D 地图坐标
function worldToMapCoordinates(worldXZCoordinates: Vector2, mapOffset: Vector2, mapSizeFactor: number): Vector2 {
  const pixelCoordinates = getPixelCoordinates(worldXZCoordinates, mapOffset, mapSizeFactor)
  return getGameMapCoordinates(pixelCoordinates, mapSizeFactor)
}
export { getGameMapCoordinates, getPixelCoordinates, getWorldCoordinates, Vector2, worldToMapCoordinates }
