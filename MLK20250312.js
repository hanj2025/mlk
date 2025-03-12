// ==UserScript==
// @name         名录库助手
// @namespace    https://gitee.com/hanj-cn
// @version      1.0
// @description  自动填写助手
// @updateURL    https://ghfast.top/https://raw.githubusercontent.com/hanj2025/mlk/main/MLK20250312.js
// @downloadURL  https://ghfast.top/https://raw.githubusercontent.com/hanj2025/mlk/main/MLK20250312.js
// @author       GOD
// @match        *://tjymlk.stats.gov.cn/*

// ==/UserScript==

(function () {
  // 这是错误提示元素的xpath

  const xpathItem =
    '//*[@id="content"]/section[2]/common-project-bill/common-bill/div/div[1]/common-sequence/div[2]/div/div/div';

  // 点击元素
  function clickItem(itemNo) {
    const itemElement = document.evaluate(
      '//*[@id="content"]/section[2]/common-project-bill/common-bill/div/div[1]/common-sequence/div[2]/div[' +
        itemNo +
        "]/div/div",
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    if (!itemElement) {
      console.log("未找到目标元素");
      return;
    }

    // 获取父级 div
    const parentDiv = itemElement.parentElement;
    if (!parentDiv) {
      console.log("未找到父级div");
      return;
    }

    // 获取父级的下一个兄弟元素
    const nextSibling = parentDiv.nextElementSibling;
    if (!nextSibling) {
      console.log("未找到下一个兄弟元素");
      return;
    }

    // 模拟点击
    nextSibling.click();
  }
  // 创建助手盒子
  function createHelperBox() {
    // 创建主容器
    const helperBox = document.createElement("div");
    helperBox.id = "mlk-helper";
    helperBox.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          width: 200px;
          background-color: rgba(255, 255, 255, 0.95);
          border: 2px solid #ff3333;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(255, 0, 0, 0.2);
          z-index: 10000;
          user-select: none;
        `;

    // 创建标题栏
    const titleBar = document.createElement("div");
    titleBar.style.cssText = `
          padding: 10px;
          background-color: #ff3333;
          color: white;
          font-weight: bold;
          border-radius: 6px 6px 0 0;
          cursor: move;
          text-align: center;
        `;
    titleBar.textContent = "MLK Helper";

    // 创建按钮容器
    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText = `
          padding: 10px;
          display: flex;
          gap: 10px;
          justify-content: center;
        `;

    // 创建按钮样式
    const buttonStyle = `
          padding: 5px 15px;
          background-color: #ff3333;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: bold;
        `;

    // 创建按钮
    const button1 = document.createElement("button");
    button1.textContent = "改错";
    button1.style.cssText = buttonStyle;

    const button2 = document.createElement("button");
    button2.textContent = "自动";
    button2.style.cssText = buttonStyle;

    // 添加按钮点击事件
    button1.addEventListener("click", clickBtn1);
    button2.addEventListener("click", clickBtn2);

    // 添加按钮悬停效果
    [button1, button2].forEach((button) => {
      button.addEventListener("mouseover", () => {
        button.style.backgroundColor = "#ff0000";
        button.style.transform = "scale(1.05)";
      });
      button.addEventListener("mouseout", () => {
        button.style.backgroundColor = "#ff3333";
        button.style.transform = "scale(1)";
      });
    });

    // 组装元素
    buttonContainer.appendChild(button1);
    buttonContainer.appendChild(button2);
    helperBox.appendChild(titleBar);
    helperBox.appendChild(buttonContainer);

    // 添加拖动功能
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    titleBar.addEventListener("mousedown", (e) => {
      isDragging = true;
      initialX = e.clientX - helperBox.offsetLeft;
      initialY = e.clientY - helperBox.offsetTop;
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        helperBox.style.left = `${currentX}px`;
        helperBox.style.top = `${currentY}px`;
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });

    // 添加到页面
    document.body.appendChild(helperBox);
  }
  // 获取所有元素的文本内容
  function getAllElementsTextByXPath(xpath) {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    const nodes = [];
    for (let i = 0; i < result.snapshotLength; i++) {
      nodes.push(result.snapshotItem(i).textContent);
    }
    return nodes;
  }

  function solveError113() {
    // 用xpath获取元素
    const address = document.evaluate(
      '//*[@id="xxdz"]/input',
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    if (!address) {
      console.log("未找到输入框元素");
      return;
    }

    const areaCodeValue = findAreaCode(address.value);

    // 填入区划代码
    if (areaCodeValue) {
      setValueByXpath('//*[@id="qhdm"]/input', areaCodeValue);
      setValueByXpath('//*[@id="zcdqhdm"]/input', areaCodeValue);
    } else {
      console.log("未找到匹配的区划代码");
    }
  }
  // 计算区划代码
  function findAreaCode(addressValue) {
    let areaCode = {
      当阳: 420582000000,
      玉阳: 420582001000,
      熊家山社区: 420582001001,
      太子桥社区: 420582001002,
      东门楼社区: 420582001003,
      子龙路社区: 420582001004,
      窑湾社区: 420582001005,
      南门垱社区: 420582001006,
      付家岗社区: 420582001007,
      香榭里社区: 420582001008,
      广家洲社区: 420582001009,
      东群村: 420582001201,
      新民村: 420582001202,
      北门村: 420582001203,
      长坂村: 420582001204,
      望城村: 420582001205,
      三里港村: 420582001206,
      和平村: 420582001207,
      窑湾村: 420582001208,
      白龙村: 420582001209,
      庆丰岗村: 420582001210,
      坳口村: 420582001211,
      金塔村: 420582001212,
      坝陵: 420582002000,
      坝陵桥社区: 420582002001,
      慈化寺社区: 420582002002,
      锦屏山社区: 420582002003,
      白庙村: 420582002201,
      群力村: 420582002202,
      坝陵村: 420582002203,
      何畈村: 420582002206,
      国河村: 420582002207,
      苏河村: 420582002208,
      花园村: 420582002209,
      童台村: 420582002210,
      木林村: 420582002211,
      群益村: 420582002212,
      群华村: 420582002213,
      荣耀村: 420582002214,
      照耀村: 420582002215,
      精耀村: 420582002216,
      黄林村: 420582002217,
      鲁山村: 420582002218,
      慈化村: 420582002219,
      玉泉: 420582003000,
      娘娘庙社区: 420582003001,
      子龙村: 420582003201,
      合意村: 420582003202,
      玉泉村: 420582003203,
      岩屋庙村: 420582003204,
      关陵庙村: 420582003205,
      雄风村: 420582003206,
      官道河村: 420582003207,
      干河村: 420582003208,
      清溪村: 420582003209,
      枣林村: 420582003210,
      三桥村: 420582003211,
      柳林村: 420582003212,
      金沙村: 420582003213,
      焦堤村: 420582003214,
      百宝寨村: 420582003215,
      两河: 420582101000,
      麦城社区: 420582101001,
      双龙村: 420582101201,
      友谊村: 420582101202,
      民主村: 420582101203,
      赵闸村: 420582101204,
      胡场村: 420582101205,
      麦城村: 420582101206,
      富里寺村: 420582101207,
      群丰村: 420582101208,
      群合村: 420582101209,
      糜城村: 420582101210,
      新星村: 420582101211,
      孙场村: 420582101212,
      河溶: 420582102000,
      过街楼社区: 420582102001,
      三星寺村: 420582102200,
      星火村: 420582102201,
      赵湖村: 420582102202,
      观基寺村: 420582102203,
      前英村: 420582102204,
      前进村: 420582102205,
      前合村: 420582102206,
      前华村: 420582102207,
      郭家场村: 420582102208,
      前程村: 420582102209,
      民新村: 420582102210,
      建国村: 420582102211,
      民合村: 420582102212,
      民耀村: 420582102213,
      红联村: 420582102214,
      红胜村: 420582102215,
      红日村: 420582102216,
      红明村: 420582102217,
      丁场村: 420582102218,
      官垱村: 420582102219,
      淯溪: 420582103000,
      淯溪河社区: 420582103001,
      月潭河社区: 420582103002,
      廖家垭村: 420582103201,
      同明村: 420582103202,
      前明村: 420582103203,
      水田湾村: 420582103204,
      红旗村: 420582103205,
      白石港村: 420582103206,
      春新村: 420582103207,
      马店村: 420582103208,
      八景坡村: 420582103209,
      龙井村: 420582103210,
      中山村: 420582103211,
      光明村: 420582103212,
      曹岗村: 420582103213,
      洪锦村: 420582103214,
      洪桥铺村: 420582103215,
      胜利村: 420582103216,
      联合村: 420582103217,
      绿林山村: 420582103218,
      脚东村: 420582103219,
      刘河村: 420582103220,
      勤丰村: 420582103221,
      林河村: 420582103222,
      九冲村: 420582103223,
      庙前: 420582104000,
      沙坝河社区: 420582104001,
      小烟墩集社区: 420582104002,
      桐树垭村: 420582104201,
      烟集村: 420582104202,
      井岗村: 420582104203,
      清平河村: 420582104204,
      旭光村: 420582104205,
      沙河村: 420582104206,
      林桥村: 420582104207,
      鞍山村: 420582104208,
      李湾村: 420582104209,
      佟湖村: 420582104210,
      英雄村: 420582104211,
      普济寺村: 420582104212,
      长春村: 420582104213,
      山峰村: 420582104214,
      庙前村: 420582104215,
      石马村: 420582104216,
      李店村: 420582104217,
      巩河村: 420582104218,
      王店: 420582105000,
      王家店社区: 420582105001,
      跑马村: 420582105201,
      木店村: 420582105202,
      新店村: 420582105203,
      史店村: 420582105204,
      朝阳观村: 420582105205,
      王店村: 420582105206,
      同心村: 420582105207,
      黑土坡村: 420582105208,
      熊河村: 420582105209,
      金星村: 420582105210,
      白河村: 420582105211,
      满山红村: 420582105212,
      双莲村: 420582105213,
      泉河村: 420582105214,
      严河村: 420582105215,
      半月: 420582106000,
      半月山社区: 420582106001,
      先锋村: 420582106201,
      红光村: 420582106202,
      燎原村: 420582106203,
      龙台村: 420582106204,
      宇宙村: 420582106205,
      罗店村: 420582106206,
      春光村: 420582106207,
      紫盖村: 420582106208,
      胡家湾村: 420582106209,
      泰山村: 420582106210,
      草埠湖: 420582107000,
      头山社区: 420582107001,
      马窑村: 420582107201,
      楚湖村: 420582107202,
      新河村: 420582107203,
      郑湖村: 420582107204,
      台渡村: 420582107205,
      南湖村: 420582107206,
      张闸村: 420582107207,
      楚城村: 420582107208,
      邵冲村: 420582107209,
      符台村: 420582107210,
      金龙村: 420582107211,
      开源村: 420582107212,
      南村: 420582107213,
      高台村: 420582107214,
    };
    let streetNames = [
      "玉阳",
      "坝陵",
      "玉泉",
      "两河",
      "河溶",
      "淯溪",
      "庙前",
      "王店",
      "半月",
      "草埠湖",
    ];
    let areaCodeValue = null;

    // 第一次匹配：查找村和社区
    for (const [name, code] of Object.entries(areaCode)) {
      if (
        addressValue.includes(name) &&
        (name.includes("村") || name.includes("社区"))
      ) {
        areaCodeValue = code;
        break;
      }
    }

    // 如果没找到村或社区，尝试匹配街道名称
    if (!areaCodeValue) {
      for (const streetName of streetNames) {
        if (addressValue.includes(streetName)) {
          // 从areaCode中查找对应的街道完整名称和代码
          for (const [name, code] of Object.entries(areaCode)) {
            if (name === streetName) {
              // 将最后一位改为1
              areaCodeValue = Math.floor(code / 10) * 10 + 1;
              console.log(
                `找到街道匹配: ${streetName}, 原代码: ${code}, 修改后: ${areaCodeValue}`
              );
              break;
            }
          }
          if (areaCodeValue) break;
        }
      }
    }

    return areaCodeValue;
  }

  function solveError122() {
    setValueByXpath('//*[@id="selYYZT"]/input', "1");
  }
  function solveError154() {
    setValueByXpath('//*[@id="selZXQY"]/input', "1");
  }
  // 通过xpath设置值
  function setValueByXpath(xpath, value) {
    try {
      const element = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      //获取父元素的上一个元素的文本内容
      const preElementText =
        element.parentElement.previousElementSibling.textContent;

      //
      if (!element) {
        console.log("未找到元素:", xpath);
        return false;
      }

      // 设置值，并将字体颜色改为红色并加粗
      element.style.color = "red";
      element.value = value;

      // 创建并触发 input 事件
      const inputEvent = new Event("input", {
        bubbles: true, // 允许事件冒泡
        cancelable: true, // 允许事件被取消
        composed: true, // 允许事件跨越 Shadow DOM 边界
      });
      element.dispatchEvent(inputEvent);

      // 创建并触发 change 事件
      const changeEvent = new Event("change", {
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      element.dispatchEvent(changeEvent);

      console.log(`${preElementText}填入: ${value}`);
      return true;
    } catch (error) {
      console.error("设置值失败:", error);
      return false;
    }
  }
  // 通过xpath获取值
  function getValueByXpath(xpath) {
    const element = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
    return element ? element.value : null;
  }

  function solveError194() {
    const fddbr = getValueByXpath('//*[@id="fddbr"]/input');
    const yddh = getValueByXpath('//*[@id="yddh"]/input');
    setValueByXpath('//*[@id="dwfzr"]/input', fddbr);
    setValueByXpath('//*[@id="tjfzr"]/input', fddbr);
    setValueByXpath('//*[@id="tbr"]/input', fddbr);
    setValueByXpath('//*[@id="tbrlxdh"]/input', yddh);
  }
  // 按钮1点击事件
  function solveError() {
    const xpathError =
      '//*[@id="content"]/section[2]/common-project-bill/common-bill/div/div[1]/mat-drawer-container/mat-drawer/div/common-bill-check-list/div/div/div[2]/div[2]/div[1]/div';
    //先读取错误列表
    const errorList = getAllElementsTextByXPath(xpathError);
    //截取每个错误的前3个数字
    let errorNoList = [];
    for (let i = 0; i < errorList.length; i++) {
      errorNoList.push(errorList[i].slice(0, 3));
    }
    //根据每个错误的前3个数字，执行对应的函数
    for (let i = 0; i < errorNoList.length; i++) {
      switch (errorNoList[i]) {
        case "113":
          solveError113();
          break;
        case "122":
          solveError122();
          break;
        case "154":
          solveError154();
          break;
        case "194":
          solveError194();
          break;
      }
    }
  }
  function clickBtn1() {
    solveError();
  }
  // 按钮2点击事件
  function clickBtn2() {
    let id = "";
    setInterval(function () {
      id = autoSolveError();
    }, 3000);
  }
  function autoSolveError(idOld) {
    //先获取流水号
    const idNew = getValueByXpath('//*[@id="mat-input-1"]');
    if (idNew != idOld) {
      solveError();
      //依次点击两个按钮
      // 定义有效的 XPath 表达式，使用 XPath 1.0 兼容方式
      const xpath =
        '//*[starts-with(@id, "mat-mdc-checkbox-") and substring(@id, string-length(@id) - string-length("-input") + 1) = "-input"]';
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );

      let element = null;
      for (let i = 0; i < result.snapshotLength; i++) {
        element = result.snapshotItem(i);
        console.log("找到元素:", element);
      }
      element.click();
      //点击保存
      setTimeout(function () {
        // 定义目标元素的 XPath
        const targetXPath =
          '//*[@id="content"]/section[2]/common-project-bill/common-bill/div/div[2]/div[2]';
        // 执行 XPath 查询获取目标元素
        const targetResult = document.evaluate(
          targetXPath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        const targetElement = targetResult.singleNodeValue;

        if (targetElement) {
          // 获取目标元素的最后一个子元素
          const lastChild = targetElement.lastElementChild;
          if (lastChild) {
            try {
              // 模拟点击最后一个子元素
              lastChild.click();
              console.log("成功点击最后一个子元素");
            } catch (error) {
              console.error("点击最后一个子元素时出错:", error);
            }
          } else {
            console.log("目标元素没有子元素");
          }
        } else {
          console.log("未找到目标元素");
        }
      }, 1000);
      return idNew;
    }
  }
  function clickEleByXpath(xpath) {
    // 使用 document.evaluate 方法通过 XPath 查找元素
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    // 获取查找到的第一个元素
    const element = result.singleNodeValue;

    if (element) {
      try {
        // 模拟点击元素
        element.click();
        console.log(`成功点击元素，XPath: ${xpath}`);
      } catch (error) {
        // 若点击过程中出现错误，打印错误信息
        console.error(`点击元素时出错，XPath: ${xpath}`, error);
      }
    } else {
      // 若未找到元素，打印提示信息
      console.log(`未找到元素，XPath: ${xpath}`);
    }
  }

  // 创建助手盒子
  createHelperBox();
})();
