const jpeg = require("jpeg-js");
const PNGReader = require("png.js");

let retryCount = 0;

let testAll = 0;
let testSucess = 0;
let testFaile = 0;

// X轴轨迹模拟
function fitting(t, max = 224, min = 7) {
  let A = max + 2;
  let B = -1.638;
  let C = (max / 7) * 4;
  let D = min + 2;
  return Math.floor(
    (A - D) / (1 + (t / C) ** B) +
      D +
      Math.random() * 2 * (Math.random() > 0.5 ? 1 : -1)
  );
}

// y轴轨迹模拟
function fittingY(x) {
  let A = 27;
  let B = 0.0191273;
  let C = 7.40487 / 100000;
  return Math.floor(A + B * x + C * x ** 2);
}

// 时间序列取样
function timeArraGen(totalTime) {
  const PARAM_ARR1 = [0.05, 0.5, 1];
  const PARAM_ARR2 = [0.14, 0.66, 0.2];
  const COUNT = Math.ceil(totalTime / 50);
  const TIME_ARR = PARAM_ARR1.map(e => Math.ceil(totalTime * e));
  const COUNT_ARR = PARAM_ARR2.map(e => Math.ceil(COUNT * e));
  let tempArr = [];
  COUNT_ARR.forEach((count, index) => {
    for (let i = 1; i <= count; i++) {
      tempArr.push(
        Math.floor(
          (TIME_ARR[index] / count) * i +
            Math.random() * 3 * (Math.random() > 0.5 ? 1 : -1)
        )
      );
    }
  });
  tempArr = Array.from(new Set(tempArr));
  return tempArr.sort((a, b) => a - b);
}

// 轨迹生成
function traceGen(max) {
  let totalTime = Math.min(Math.max((max / 0.98) * 10, 1024), 2019);
  let timeArr = timeArraGen(totalTime);
  let _trace = "";
  let firstX = 0;
  let timeArrLen = timeArr.length;
  timeArr.forEach((time, index) => {
    let x = fitting(time, max);
    if (index === 0) {
      firstX = x;
    }
    let y = fittingY(x);
    _trace += `${x},${y},${time}|`;
  });
  firstX = Math.min(firstX - 8, 11 + Math.ceil(Math.random() * 2));
  _trace += `${max + 1},${33 +
    Math.ceil(Math.random() * 2) * (Math.random() > 0.5 ? 1 : -1)},${timeArr[
    timeArrLen - 1
  ] + 15}|`;
  _trace = `${firstX},${27},${timeArr[0] - 10 || 10}|` + _trace;
  return { trace: _trace, distance: max + 1 - firstX };
}

class SliderImage {
  constructor(imgObj) {
    let { data = [], width = 0, height = 0 } = imgObj;
    this.data = data;
    this.width = width;
    this.height = height;
  }

  im2bw(yuzhi = 0) {
    this.data = this.data.map(e => (Math.abs(e) > yuzhi ? 1 : 0));
    return this;
  }

  rowSum() {
    let tempArr = [];
    let { data: arr, width: w, height: h } = this;
    for (let i = 0; i < h; i++) {
      tempArr.push(arr.slice(i * w, i * w + w).reduce((a, b) => a + b));
    }
    this.sumRow = tempArr;
    return this;
  }

  colSum() {
    let tempArr = [];
    let { data: arr, width: w, height: h } = this;
    for (let i = 0; i < w; i++) {
      let temp = [];
      for (let j = 0; j < h; j++) {
        temp.push(arr[i + j * w]);
      }
      tempArr.push(temp.reduce((a, b) => a + b));
    }
    this.sumCol = tempArr;
    return this;
  }

  cut(top, bottom) {
    let { data, width, height } = this;
    // let result = {};
    this.data = data.filter(
      (e, index) => index >= top * width && index < (bottom + 1) * width
    );
    // result.width = width;
    this.height = bottom - top + 1;
    return this;
  }

  gradient() {
    let { data, width, height } = this;
    let rightMoveData = data.map((e, ind) => {
      if (ind % width === 0) {
        return data[ind];
      } else {
        return data[ind - 1];
      }
    });
    this.data = data.map((item, index) => {
      return item - rightMoveData[index];
    });
    return this;
  }
}

class PuzzleImage extends SliderImage {
  constructor(props, PUZZLE_EDGE_MEDIUM = 35) {
    super(props);
    this.PUZZLE_EDGE_MEDIUM = PUZZLE_EDGE_MEDIUM; //判断内边缘阈值
    this.hasTopAndBottom = false;
  }

  _findArrayFirstElement(arr, min, direction = "left") {
    if (direction === "left") {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] >= min) return i;
      }
    } else if (direction === "right") {
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] >= min) return i;
      }
    }
    return -1;
  }

  getPuzzleEdge() {
    let rows = this.im2bw().rowSum().sumRow;
    let cols = this.im2bw().colSum().sumCol;
    // console.warn(rows,cols);

    // 下列返回值起始值均为0
    let top = this._findArrayFirstElement(rows, 1, "left"),
      bottom = this._findArrayFirstElement(rows, 1, "right"),
      top2 = this._findArrayFirstElement(rows, this.PUZZLE_EDGE_MEDIUM, "left"),
      bottom2 = this._findArrayFirstElement(
        rows,
        this.PUZZLE_EDGE_MEDIUM,
        "right"
      ),
      left = this._findArrayFirstElement(cols, 1, "left"),
      right = this._findArrayFirstElement(cols, 1, "right"),
      left2 = this._findArrayFirstElement(cols, this.f, "left"),
      right2 = this._findArrayFirstElement(
        cols,
        this.PUZZLE_EDGE_MEDIUM,
        "right"
      );
    this.topOut = top;
    this.topIn = top2;
    this.rightOut = right;
    this.rightIn = right2;
    this.bottomOut = bottom;
    this.bottomIn = bottom2;
    this.leftOut = left;
    this.leftIn = left2;

    this.innerWidth = right2 - left2;
    this.innerHeight = bottom2 - top2;

    if (top > 0 && bottom > 0) this.hasTopAndBottom = true;
    return this;
  }
}

// 在曲线图中寻找四边形（宽高在一定范围波动）
function findRectLikeInArr(allPoints, reactW, reaactH, wave = 4) {
  function intersection(setA, setB) {
    let _intersection = new Set();
    for (let elem of setB) {
      if (setA.has(elem)) {
        _intersection.add(elem);
      }
    }
    return _intersection;
  }
  let points = [],
    resultIndex = -1,
    pointIndexSet;
  allPoints.forEach((value, index) => {
    value > (reaactH / 3) * 2 - 6 && points.push({ value, index });
  });
  pointIndexSet = new Set(points.map(e => e.index));
  points.forEach(point => {
    let { value, index } = point;
    let waveIndexSet = new Set(
      new Array(2 * wave + 1)
        .fill(index + reactW - wave)
        .map((e, ind) => e + ind)
    );
    if (intersection(pointIndexSet, waveIndexSet).size && resultIndex === -1) {
      resultIndex = index;
    }
  });
  return resultIndex;
}

// 获取最佳轨迹
function getSubmitParam(imgPuzzle, imgBg) {
  const GRADIENT_MIN = 30;
  let puzzle = new PuzzleImage(imgPuzzle);
  let bg = new SliderImage(imgBg);
  puzzle.getPuzzleEdge();
  if (puzzle.hasTopAndBottom) {
    let gradientSumCol = bg
      .cut(puzzle.topOut, puzzle.bottomOut)
      .gradient()
      .im2bw(GRADIENT_MIN)
      .colSum().sumCol;
    let distance = Math.floor(
      (findRectLikeInArr(
        gradientSumCol,
        puzzle.innerWidth,
        puzzle.innerHeight
      ) *
        7) /
        12
    );
    if (distance === -1) {
      console.warn(gradientSumCol.join(" "));
      console.warn(bg, puzzle);
      puzzle = null;
      bg = null;
      return null;
    }
    // 根据调试，轨迹距离与实际距离有偏差成功率较高
    // 经测试，该算法验证成功率约为92%(200,184,16)，失败目前大都由错误距离引起，可优化 by lzl 2019-3-17
    let traceObj = traceGen(distance + 2);
    let counter = 10;
    while (
      (distance - traceObj.distance <= 4 ||
        distance - traceObj.distance >= 10) &&
      counter > 0
    ) {
      traceObj = traceGen(distance + 2);
      counter--;
    }
    puzzle = null;
    bg = null;
    return traceObj;
  } else {
    puzzle = null;
    bg = null;
    return null;
  }
}

// 图像灰度化
function rgba2gray(rgbaArr) {
  let grayResult = [];
  let tempSum = 0;
  const rgb = [0.299, 0.587, 0.114];
  rgbaArr.forEach((item, ind) => {
    if (ind % 4 === 3) {
      grayResult.push(Math.round(tempSum));
      tempSum = 0;
    } else {
      tempSum += item * rgb[ind % 4];
    }
  });
  return grayResult;
}

// 读取buffer图像
function getDataByBuffer(buffer, type = "jpeg") {
  return new Promise((resolve, reject) => {
    try {
      if (type === "jpeg") {
        let rawImageData = jpeg.decode(buffer, true);
        rawImageData.data = rgba2gray(rawImageData.data);
        resolve(rawImageData);
      } else if (type === "png") {
        let pngReader = new PNGReader(buffer);
        pngReader.parse({ data: true }, function(err, png) {
          if (err) throw err;
          png.data = rgba2gray(png.pixels);
          resolve(png);
        });
      } else {
        console.error("buffer图片读取错误，请检查图片格式：", err);
        resolve(null);
      }
    } catch (err) {
      console.error("buffer图片读取错误，请检查图片格式：", err);
      resolve(null);
    }
  });
}

// 提交结果检验
function autoSubmit(submit, traceObj) {
  return new Promise((resolve, reject) => {
    if (traceObj && traceObj.trace && traceObj.distance) {
      setTimeout(() => {
        submit(traceObj.trace, traceObj.distance)
          .then(e => {
            console.log("校验结果：", e);
            testAll++;
            if (e.ok) {
              testSucess++;
              resolve(true);
            } else {
              testFaile++;
              console.warn("导致验证失败的轨迹及计算出的距离:", traceObj);
              resolve(false);
            }
          })
          .catch(err => {
            console.error("爬虫验证码轨迹提交错误：", err);
            resolve(false);
          });
      }, 500);
    } else {
      resolve(false);
    }
  });
}

async function getAutoSubmitResult(imgBgSrc, imgPuzzleSrc, submit) {
  let imgPuzzle = await getDataByBuffer(imgPuzzleSrc, "png");
  let imgBg = await getDataByBuffer(imgBgSrc, "jpeg");
  if (imgPuzzle === null || imgBg === null) {
    return null;
  }

  let traceObj = getSubmitParam(imgPuzzle, imgBg);
  if (traceObj === null) {
    return null;
  }
  let autoSubmitResult = await autoSubmit(submit, traceObj);
  return autoSubmitResult;
}

function restart(refreshImg, submit, close) {
  refreshImg().then(async res => {
    console.log("重新获取滑动验证码数据：", res);
    if (res.ok && res.data && res.data.puzzleImg) {
      let {
        data: { bgImg, puzzleImg }
      } = res;
      let autoSubmitResult = await getAutoSubmitResult(
        bgImg,
        puzzleImg,
        submit
      );
      if (!autoSubmitResult) {
        if (retryCount < 3) {
          restart(refreshImg, submit, close);
        } else {
          retryCount = 0;
          console.error("连续多次滑动验证吗验证失败，请及时检查原因");
          close();
        }
      } else {
        retryCount = 0;
        // // 测试代码
        // testReq();
      }
    } else {
      close();
    }
  });
}

async function slideCodeCrack(_props) {
  let {
    data: { bgImg, puzzleImg },
    submit,
    refreshImg,
    close
  } = _props;
  console.log("获取滑动验证码数据：", _props);
  let autoSubmitResult = await getAutoSubmitResult(bgImg, puzzleImg, submit);
  // console.warn(autoSubmitResult);
  if (!autoSubmitResult) {
    restart(refreshImg, submit, close);
  } else {
    // // 测试代码
    console.warn("总数:", testAll, "成功:", testSucess, "失败:", testFaile);
    // testReq();
  }
}

module.exports = {
  slideCodeCrack
};
