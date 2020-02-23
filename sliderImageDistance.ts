interface ImageProps {
  data: number[];
  width: number;
  height: number;
}

class Img {
  protected data: number[];
  protected width: number;
  protected height: number;
  public imageRowSum: number[];
  public imageColSum: number[];

  static rgba2gray(
    rgbaArr,
    option = { red: 0.299, green: 0.587, blue: 0.114 }
  ) {
    let grayResult = [];
    let tempSum = 0;
    const rgbRatio = [option.red, option.green, option.blue];
    rgbaArr.forEach((item, ind) => {
      if (ind % 4 === 3) {
        grayResult.push(Math.round(tempSum));
        tempSum = 0;
      } else {
        tempSum += item * rgbRatio[ind % 4];
      }
    });
    return grayResult;
  }

  constructor(imgObj: ImageProps) {
    const { data, width, height } = imgObj;
    this.data = data;
    this.width = Math.floor(width);
    this.height = Math.floor(height);
  }

  private sum(param: number[]) {
    return param.reduce((a, b) => a + b);
  }

  private getRow(index: number, data = this.data, width = this.width) {
    return data.slice(index * width, (index + 1) * width);
  }

  private getCol(index: number, data = this.data, width = this.width) {
    return data.filter((tone, ind) => ind % width === index);
  }

  im2bw(threshold = 0) {
    this.data = this.data.map(tone => (Math.abs(tone) > threshold ? 1 : 0));
    return this;
  }

  rowSum() {
    this.imageRowSum = new Array(this.height)
      .fill(0)
      .map((h, ind) => this.sum(this.getRow(ind)));
    return this;
  }

  colSum() {
    this.imageColSum = new Array(this.width)
      .fill(0)
      .map((w, ind) => this.sum(this.getCol(ind)));
    return this;
  }

  cutVertical(top, bottom) {
    let { data, width } = this;
    this.data = data.filter(
      (e, index) => top * width <= index && index < (bottom + 1) * width
    );
    this.height = bottom - top + 1;
    return this;
  }

  gradient() {
    let { data, width } = this;
    let rightMoveImg = data.map((e, ind) => {
      const isFirstCol = ind % width === 0;
      return isFirstCol ? data[ind] : data[ind - 1];
    });
    this.data = data.map((item, index) => item - rightMoveImg[index]);
    return this;
  }
}

class PuzzleImg extends Img {
  private readonly PUZZLE_EDGE_IN_THRESHOLD: number;
  private readonly PUZZLE_EDGE_OUT_THRESHOLD: number;
  public hasTopAndBottom: boolean = false;
  public innerWidth: number = 0;
  public innerHeight: number = 0;
  public topEdge: number = -1;
  public bottomEdge: number = -1;

  constructor(props, inThreshold = 35, outThreshold = 1) {
    super(props);
    this.PUZZLE_EDGE_IN_THRESHOLD = inThreshold; //判断内边缘阈值
    this.PUZZLE_EDGE_OUT_THRESHOLD = outThreshold; //判断外边缘阈值
  }

  private findArrayFirstElementBothDirection(arr: number[], min: number) {
    const leftIndex = arr.findIndex(num => num >= min);
    let rightIndex = -1;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] >= min) {
        rightIndex = i;
        break;
      }
    }
    return { leftIndex, rightIndex };
  }

  getPuzzleEdge() {
    const calculatedImg = this.im2bw()
      .rowSum()
      .colSum();
    let rows = calculatedImg.imageRowSum;
    let cols = calculatedImg.imageColSum;

    const {
      leftIndex: topOut,
      rightIndex: bottomOut
    } = this.findArrayFirstElementBothDirection(
      rows,
      this.PUZZLE_EDGE_OUT_THRESHOLD
    );
    const {
      leftIndex: topIn,
      rightIndex: bottomIn
    } = this.findArrayFirstElementBothDirection(
      rows,
      this.PUZZLE_EDGE_IN_THRESHOLD
    );
    const {
      leftIndex: leftIn,
      rightIndex: rightIn
    } = this.findArrayFirstElementBothDirection(
      cols,
      this.PUZZLE_EDGE_IN_THRESHOLD
    );

    this.innerWidth = rightIn - leftIn;
    this.innerHeight = bottomIn - topIn;

    if (topOut > 0 && bottomOut > 0) this.hasTopAndBottom = true;
    this.topEdge = topOut;
    this.bottomEdge = bottomOut;
    return this;
  }
}

// 集合交集
function intersectNoNull(arrA: Array<any>, arrB: Array<any>) {
  for (let item of arrB) {
    if (arrA.includes(item)) {
      return true;
    }
  }
}

// 在曲线图中寻找直角梯形（宽高在一定范围波动）
function findRectLikeInArr(
  allPoints: number[],
  rectWidth: number,
  rectHeight: number,
  option = { heightCandidateRation: 1 / 2, widthAmplitude: 4 }
) {
  const { heightCandidateRation, widthAmplitude } = option;
  const candidatePoints = allPoints
    .map((value, index) => ({ value, index }))
    .filter(point => point.value > rectHeight * heightCandidateRation);

  const candidatePointIndexSet = candidatePoints.map(e => e.index);
  for (let point of candidatePoints) {
    const { index } = point;
    const satisfiedIndexSet = new Array(2 * widthAmplitude + 1)
      .fill(index + rectWidth - widthAmplitude)
      .map((e, ind) => e + ind);
    if (intersectNoNull(candidatePointIndexSet, satisfiedIndexSet))
      return index;
  }
}

// 计算所需移动的距离
function calculateDistance(imgPuzzle: ImageProps, imgBg: ImageProps) {
  const GRADIENT_MIN = 30;
  const bg = new Img(imgBg);
  const puzzle = new PuzzleImg(imgPuzzle);
  puzzle.getPuzzleEdge();

  if (puzzle.hasTopAndBottom) {
    const gradientSumCol = bg
      .cutVertical(puzzle.topEdge, puzzle.bottomEdge)
      .gradient()
      .im2bw(GRADIENT_MIN)
      .colSum().imageColSum;
    const distance = findRectLikeInArr(
      gradientSumCol,
      puzzle.innerWidth,
      puzzle.innerHeight
    );
    return distance;
  } else {
    return -1;
  }
}

// 加载图片数据
function loadImageData(inputFile: string | Blob): Promise<ImageProps> {
  return new Promise((resolve, reject) => {
    function calcSize(file: Blob) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = function(e) {
        let img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          const w = img.width;
          const h = img.height;
          canvas.width = w;
          canvas.height = h;
          let imageData: any;
          context.drawImage(img, 0, 0, w, h);
          imageData = context.getImageData(0, 0, w, h);
          imageData = Img.rgba2gray(imageData.data);
          resolve({ data: imageData, width: w, height: h });
        };
        img.src = e.target.result.toString();
      };
    }

    if (typeof inputFile === "string") {
      fetch(inputFile).then(res => {
        res.blob().then(blob => {
          if (blob.type && blob.type.startsWith("image/")) {
            calcSize(blob);
          } else {
            reject({ ok: false, msg: "传入文件的非图片" });
          }
        });
      });
    } else if (typeof inputFile === "object") {
      if (
        inputFile instanceof Blob &&
        inputFile.type &&
        inputFile.type.startsWith("image/")
      ) {
        calcSize(inputFile);
      } else {
        reject({ ok: false, msg: "传入文件的非图片" });
      }
    } else {
      reject({
        ok: false,
        msg: "传入的参数类型不符合要求，仅能传入blob或图片url"
      });
    }
  });
}
