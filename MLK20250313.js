// ==UserScript==
// @name         名录库助手
// @namespace    https://gitee.com/hanj-cn
// @version      2.6
// @description  全自动改错
// @updateURL    https://ghfast.top/https://raw.githubusercontent.com/NinaTracy/MLK/main/MLK20250313.js
// @downloadURL  https://ghfast.top/https://raw.githubusercontent.com/NinaTracy/MLK/main/MLK20250313.js
// @author       GOD
// @match        *://tjymlk.stats.gov.cn/*
// ==/UserScript==

//更新时间：2025年3月17日
(function () {
  // 全局变量
  const State = {
    isAutoRunning: false,
    timer: null,
    progressTimer: null, // 新增属性跟踪进度定时器
    currentCompany: "",
    processedCount: 0,
    successCount: 0,
    startTime: null,
    lastUpdateTime: null,
  };

  // 延迟执行
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

      if (!element) {
        console.log("未找到元素:", xpath);
        return false;
      }

      // 获取字段名称用于日志显示
      let fieldName = "";
      try {
        fieldName = element.parentElement.previousElementSibling.textContent;
      } catch (e) {
        fieldName = xpath;
      }

      // 设置值，并将字体颜色改为红色
      element.style.color = "red";
      element.value = value;

      // 创建并触发事件
      ["input", "change"].forEach((eventType) => {
        const event = new Event(eventType, {
          bubbles: true,
          cancelable: true,
          composed: true,
        });
        element.dispatchEvent(event);
      });

      console.log(`${fieldName} 填入: ${value}`);
      return true;
    } catch (error) {
      console.error("设置值失败:", error);
      return false;
    }
  }

  // 通过xpath获取值
  function getValueByXpath(xpath) {
    try {
      const element = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      return element ? element.value : null;
    } catch (error) {
      console.error("获取值失败:", error);
      return null;
    }
  }

  // 查找元素
  function findElement(xpath) {
    try {
      return document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
    } catch (error) {
      console.error("查找元素失败:", error);
      return null;
    }
  }

  // 显示消息提示
  function showMessage(text, type = "info") {
    const colors = {
      info: "#2196F3",
      success: "#4CAF50",
      error: "#F44336",
      warning: "#FF9800",
    };

    // 查找现有消息容器或创建新的
    let messageContainer = document.getElementById("mlk-message-container");
    if (!messageContainer) {
      messageContainer = document.createElement("div");
      messageContainer.id = "mlk-message-container";
      messageContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10001;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    `;
      document.body.appendChild(messageContainer);
    }

    const toast = document.createElement("div");
    toast.textContent = text;
    toast.style.cssText = `
    padding: 10px 20px;
    background-color: ${colors[type]};
    color: white;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    font-weight: bold;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;

    messageContainer.appendChild(toast);

    // 确保消息显示出来
    setTimeout(() => {
      toast.style.opacity = 1;
    }, 10);

    // 自动消失
    setTimeout(() => {
      toast.style.opacity = 0;
      setTimeout(() => toast.remove(), 300);
    }, 3000);

    // 同时记录到控制台
    log(text, type);
  }
  /**
   *期末从业人数设为1，营业收入(千元)设为1
   */
  function solveErrorPeopleNumberAndIncome() {
    setValueByXpath('//*[@id="qmcyrs"]/input', "1");
    setValueByXpath('//*[@id="yysr"]/input', "1");
  }
  /**
   * 112.详细地址如果填写，则长度应大于等于2个汉字；且不能全部由数字或字母组成，同时满足以下条件：1.不能含有半角-单引号、双引号、逗号、问号、@等非法字符；2.不能含有全角-单引号、双引号、逗号、问号、@等非法字符；3.不能含半个汉字。
   * 087.如果填写，则长度应大于等于2个汉字；且不能全部由数字或字母组成，同时满足以下条件：1.不能含有半角-单引号、双引号、逗号、问号、@等非法字符；2.不能含有全角-单引号、双引号、逗号、问号、@等非法字符；3.不能含半个汉字。
   * @returns {boolean} 是否成功修复
   */
  function solveError112() {
    // 获取详细地址和注册地址
    const xxdz = getValueByXpath('//*[@id="xxdz"]/input');
    const zcdz = getValueByXpath('//*[@id="zcdxxdz"]/input');

    if ((!xxdz || xxdz.trim() === "") && (!zcdz || zcdz.trim() === "")) {
      console.log("未找到详细地址和注册地址或两者均为空");
      return false;
    }

    // 清理地址函数
    function cleanAddress(address) {
      if (!address) return "";

      // 先转换全角数字为半角数字
      const fullToHalfMap = {
        "１": "1",
        "２": "2",
        "３": "3",
        "４": "4",
        "５": "5",
        "６": "6",
        "７": "7",
        "８": "8",
        "９": "9",
        "０": "0",
      };

      let cleanedAddress = address;

      // 替换全角数字
      for (const [full, half] of Object.entries(fullToHalfMap)) {
        cleanedAddress = cleanedAddress.replace(new RegExp(full, "g"), half);
      }

      // 然后处理特殊字符
      cleanedAddress = cleanedAddress
        // 去除半角标点符号: ' " , ? @ - ( ) [ ] { }
        .replace(/['",?@\-()[]{}]/g, "")
        // 去除全角标点符号：''""，？＠－（）【】「」『』〔〕［］｛｝
        .replace(/[''"",，？？＠－（）【】「」『』〔〕［］｛｝]/g, "")
        // 替换多个连续空格为单个空格
        .replace(/\s+/g, " ")
        // 移除前后空格
        .trim();

      return cleanedAddress;
    }

    // 处理单个地址的函数
    function processAddress(address, fieldName) {
      if (!address || address.trim() === "") return "";

      let cleanedAddress = cleanAddress(address);

      // 检查是否全为数字或字母或长度不足
      const isAllDigitsOrLetters = /^[A-Za-z0-9]+$/.test(cleanedAddress);

      if (isAllDigitsOrLetters || cleanedAddress.length < 2) {
        // 尝试获取单位名称作为补充
        const companyName = getValueByXpath('//*[@id="dwmc"]/input');

        if (companyName && companyName.trim() !== "") {
          // 将单位名称添加到地址前
          cleanedAddress = companyName + "办公地址" + cleanedAddress;
          console.log(`${fieldName}格式无效，已使用单位名称补充地址`);
        } else {
          // 如果没有单位名称，使用默认地址
          cleanedAddress = "湖北省宜昌市当阳市" + cleanedAddress;
          console.log(`${fieldName}格式无效，已添加默认前缀`);
        }
      }

      // 如果是纯数字地址，添加"号"字
      if (/^\d+$/.test(cleanedAddress)) {
        cleanedAddress += "号";
      }

      // 检查乱码或半个汉字情况
      if (/[\ufffd]/.test(cleanedAddress)) {
        cleanedAddress = cleanedAddress.replace(/[\ufffd]/g, "");
        console.log(`检测到${fieldName}可能的乱码，已移除`);
      }

      return cleanedAddress;
    }

    // 处理详细地址
    const processedXxdz = xxdz ? processAddress(xxdz, "详细地址") : "";

    // 处理注册地址
    let processedZcdz = zcdz ? processAddress(zcdz, "注册地址") : "";

    // 如果注册地址为空但详细地址不为空，则使用详细地址
    if ((!processedZcdz || processedZcdz === "") && processedXxdz) {
      processedZcdz = processedXxdz;
      console.log("注册地址为空，已使用详细地址填充");
    }

    // 如果详细地址为空但注册地址不为空，则使用注册地址
    const finalXxdz = processedXxdz || processedZcdz;
    const finalZcdz = processedZcdz || processedXxdz;

    // 设置处理后的地址
    let success = true;
    if (xxdz !== finalXxdz) {
      success = setValueByXpath('//*[@id="xxdz"]/input', finalXxdz) && success;
    }

    if (zcdz !== finalZcdz) {
      success =
        setValueByXpath('//*[@id="zcdxxdz"]/input', finalZcdz) && success;
    }

    // 因为地址修改会影响区划代码，所以尝试更新区划代码
    if (success) {
      solveError113();
    }

    return success;
  }
  /**
   * 113.区划代码不能为空，且须与12位国家标准省地县乡村地址码一致。
   * 处理方式：跟据详细地址填写区划代码和注册地址区划代码
   * @returns {boolean} 是否成功修复
   */
  function solveError113() {
    const address = findElement('//*[@id="xxdz"]/input');

    if (!address) {
      console.log("未找到地址输入框");
      return false;
    }

    const areaCode = findAreaCode(address.value);

    // 填入区划代码
    if (areaCode) {
      setValueByXpath('//*[@id="qhdm"]/input', areaCode);
      setValueByXpath('//*[@id="zcdqhdm"]/input', areaCode);
      return true;
    } else {
      console.log("未找到匹配的区划代码");
      return false;
    }
  }
  /**
   * 根据统一社会信用代码判断单位类型，设置执行会计标准类别
   * @returns {boolean} 是否成功修复
   */
  function solveError142() {
    //获取统一社会信用代码
    const tyshxydm = getValueByXpath('//*[@id="shxydm"]/input');
    //如果统一社会信用代码为空，则返回false
    if (!tyshxydm) {
      console.log("未找到统一社会信用代码");
      return false;
    }

    // 获取统一社会信用代码的前两位字符
    const orgTypeCode = tyshxydm.substring(0, 2);
    let zxkjValue = "9"; // 默认为"其他"

    // 判断机构类型
    // 政府机构、事业单位代码规则: 1-5开头
    if (/^[1-5]/.test(orgTypeCode)) {
      zxkjValue = "2"; // 行政事业单位
      console.log("识别为行政事业单位");
    }
    // 工商企业代码规则: 9开头(91-98是企业)
    else if (/^9[1-8]/.test(orgTypeCode)) {
      zxkjValue = "1"; // 企业
      console.log("识别为企业");
      solveError154();
    }
    // 社会团体代码规则: 5开头的部分是社会团体
    else if (/^5/.test(orgTypeCode)) {
      zxkjValue = "4"; // 民间非盈利组织
      console.log("识别为民间非盈利组织");
    }
    // 其他情况
    else {
      console.log("无法识别单位类型，使用默认值'其他'");
    }

    // 设置单位会计主管部门
    return setValueByXpath('//*[@id="selZXKJ"]/input', zxkjValue);
  }
  /**
   * 091.主要业务活动1含非法字符或空格。
   * 092.主要业务活动1如果填写，长度不能超过15个汉字。
   * 处理主要业务活动有非法字符和过长的问题
   * @returns {boolean} 是否成功修复
   */
  function solveError091() {
    // 获取主要业务活动文本
    const text = getValueByXpath('//*[@id="zyywhd1"]/input');

    // 如果文本为空，则返回失败
    if (!text || text.trim() === "") {
      console.log("未找到主要业务活动");
      return false;
    }

    // 用标点符号分割文本 (中英文标点都考虑)
    const textArray = text.split(/[，。（）、：,.():；;]/);

    // 过滤掉空白项
    const filteredArray = textArray.filter(
      (item) => item && item.trim() !== ""
    );

    if (filteredArray.length === 0) {
      console.log("分割后没有有效内容");
      return false;
    }

    // 如果第二个文本存在且有效，则使用第二个文本
    // 否则使用第一个文本
    // 同时去除前后空格
    const selectedText =
      filteredArray.length > 1 && filteredArray[1].trim()
        ? filteredArray[1].trim()
        : filteredArray[0].trim();

    // 设置处理后的文本
    return setValueByXpath('//*[@id="zyywhd1"]/input', selectedText);
  }
  /**
   * 141.隶属关系如果填写，不能是（‘10中央’，‘11地方’）以外的值。
   * 设置隶属关系为11
   * @returns {boolean} 是否成功修复
   */
  function solveError141() {
    return setValueByXpath('//*[@id="selLSGX"]/input', "11");
  }
  /**
   * 170.行业代码前两位是‘51批发业’或者‘52零售业’或者‘61住宿业’或者‘62餐饮业’，则经营形式必须填写。
   * 设置经营形式为1（独立门店）
   * @returns {boolean} 是否成功修复
   */
  function solveError170() {
    return setValueByXpath('//*[@id="selJYXS"]/input', "1");
  }
  /**
   * 079.机构类型是‘10企业’，并且运营状态不是‘3筹建’，则开业年份必须填写。
   * 设置开业年月为成立年月
   * @returns {boolean} 是否成功修复
   */
  function solveError079() {
    //获取成立年
    const clnf = getValueByXpath('//*[@id="clnf"]/input');
    //获取成立月
    const clyf = getValueByXpath('//*[@id="clyf"]/input');
    //如果成立年成立月同时为空，则返回false
    if (!clnf && !clyf) {
      console.log("未找到成立年月");
      return false;
    }

    //设置开业年月
    setValueByXpath('//*[@id="kynf"]/input', clnf);
    setValueByXpath('//*[@id="kyyf"]/input', clyf);
    return true;
  }

  /**
   * 122.运营状态不能为空。
   * 设置营业状态为“1”，正常
   * @returns {boolean} 是否成功修复
   */
  function solveError122() {
    return setValueByXpath('//*[@id="selYYZT"]/input', "1");
  }

  /**
   * 154.执行会计标准类别是‘1企业’，则执行企业会计准则情况一般不能为空。
   * 设置执行企业会计准则情况为“1”，企业会计准则
   * @returns {boolean} 是否成功修复
   */
  function solveError154() {
    return setValueByXpath('//*[@id="selZXQY"]/input', "1");
  }

  /**
   * 194.单位负责人不能为空。
   * 设置单位负责、统计负责、填表人、填表人联系电话为法定代表人、手机号码
   * @returns {boolean} 是否成功修复
   */
  function solveError194() {
    const fddbr = getValueByXpath('//*[@id="fddbr"]/input');
    const yddh = getValueByXpath('//*[@id="yddh"]/input');

    if (!fddbr || !yddh) {
      console.log("未找到法定代表人或手机号码");
      return false;
    }

    let success = true;
    success &= setValueByXpath('//*[@id="dwfzr"]/input', fddbr);
    success &= setValueByXpath('//*[@id="tjfzr"]/input', fddbr);
    success &= setValueByXpath('//*[@id="tbr"]/input', fddbr);
    success &= setValueByXpath('//*[@id="tbrlxdh"]/input', yddh);
    return success;
  }

  // 计算区划代码
  function findAreaCode(address) {
    if (!address) return null;

    let areaCodeList = {
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

    let areaCode = null;

    // 第一次匹配：查找村和社区
    for (const [name, code] of Object.entries(areaCodeList)) {
      if (
        address.includes(name) &&
        (name.includes("村") || name.includes("社区"))
      ) {
        areaCode = code;
        break;
      }
    }

    // 如果没找到村或社区，尝试匹配街道名称
    if (!areaCode) {
      for (const streetName of streetNames) {
        if (address.includes(streetName)) {
          // 从areaCode中查找对应的街道完整名称和代码
          for (const [name, code] of Object.entries(areaCodeList)) {
            if (name === streetName) {
              areaCode = Math.floor(code / 10) * 10 + 1;
              console.log(`模糊匹配到: ${streetName}`);
              break;
            }
          }
          if (areaCode) break;
        }
      }
    }

    return areaCode;
  }
  /**
   * 131.机构类型是‘10企业’或者‘55农民专业合作社’的法人，且运营状态是‘1正常运营’，则营业收入不能为空。
   * 设置营业收入为0
   * @returns {boolean} 是否成功修复
   */
  function solveError131() {
    return setValueByXpath('//*[@id="yysr"]/input', "1");
  }

  // ==================== 核心功能函数 ====================
  // 处理所有错误
  async function solveError() {
    try {
      const xpathError =
        '//*[@id="content"]/section[2]/common-project-bill/common-bill/div/div[1]/mat-drawer-container/mat-drawer/div/common-bill-check-list/div/div/div[2]/div[2]/div[1]/div';

      // 读取错误列表
      const errorList = getAllElementsTextByXPath(xpathError);

      if (errorList.length === 0) {
        console.log("未发现需要修复的错误");
        return true;
      }

      console.log(`发现 ${errorList.length} 个错误需要修复`);

      // 截取每个错误的前3个数字
      let errorNoList = [];
      for (let i = 0; i < errorList.length; i++) {
        errorNoList.push(errorList[i].slice(0, 3));
      }

      // 记录已修复的错误
      let fixed = 0;

      // 根据每个错误的前3个数字，执行对应的函数
      for (let i = 0; i < errorNoList.length; i++) {
        let success = false;

        switch (errorNoList[i]) {
          //083.成立年份和开业年份相同时，开业月份不能早于成立月份
          case "083":
            success = solveError079();
            break;
          case "087":
            success = solveError112();
            break;
          case "112":
            success = solveError112();
            break;
          case "113":
            success = solveError113();
            break;
          case "122":
            success = solveError122();
            // 如果是企业，还需要设置开业年月，同时营业收入为0
            if (getValueByXpath('//*[@id="selJGLX"]/input') == 10) {
              solveError079();
              solveError131();
            }
            break;
          case "154":
            success = solveError154();
            break;
          case "194":
            success = solveError194();
            break;
          case "091":
            success = solveError091();
            break;
          //092.主要业务活动1如果填写，长度不能超过15个汉字
          case "092":
            success = solveError091();
            break;
          case "141":
            success = solveError141();
            break;
          case "142":
            success = solveError142();
            break;
          case "170":
            success = solveError170();
            break;
          case "079":
            success = solveError079();
            break;
          case "131":
            success = solveError131();
            break;
          default:
            console.log(`未知错误类型: ${errorNoList[i]}`);
        }

        if (success) fixed++;
      }

      //attention
      solveErrorPeopleNumberAndIncome();

      console.log(`修复了 ${fixed}/${errorNoList.length} 个错误`);
      return fixed > 0;
    } catch (error) {
      console.error("修复错误时出错:", error);
      return false;
    }
  }

  // 查找复选框
  async function findCheckbox() {
    const xpath =
      '//*[starts-with(@id, "mat-mdc-checkbox-") and substring(@id, string-length(@id) - string-length("-input") + 1) = "-input"]';
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue;
  }

  // 查找保存按钮
  async function findSaveButton() {
    const targetXPath =
      '//*[@id="content"]/section[2]/common-project-bill/common-bill/div/div[2]/div[2]';
    const targetResult = document.evaluate(
      targetXPath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    const targetElement = targetResult.singleNodeValue;
    return targetElement?.lastElementChild || null;
  }

  // 按钮1点击事件 - 手动修复
  async function clickBtn1() {
    try {
      const button = document.querySelector("#mlk-helper button:nth-child(1)");
      button.disabled = true;

      await solveError();
      showMessage("错误修复完成", "success");
    } catch (error) {
      console.error("手动修复出错:", error);
      showMessage("修复出错", "error");
    } finally {
      const button = document.querySelector("#mlk-helper button:nth-child(1)");
      button.disabled = false;
    }
  }

  // 按钮2点击事件 - 自动处理
  function clickBtn2() {
    const button = document.querySelector("#mlk-helper button:nth-child(2)");

    // 如果已在运行中，则停止
    if (State.isAutoRunning) {
      // 清除所有相关定时器
      clearInterval(State.timer);
      if (State.progressTimer) {
        clearInterval(State.progressTimer);
      }

      // 重置状态
      State.isAutoRunning = false;
      State.timer = null;
      State.progressTimer = null; // 添加进度定时器引用
      button.textContent = "自动";

      // 显示运行总结
      const elapsed = Math.floor((Date.now() - State.startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      const timeStr = `${minutes}分${seconds}秒`;

      showMessage(
        `处理完成！共处理 ${State.processedCount} 家企业，成功 ${State.successCount} 家，用时 ${timeStr}`,
        "success"
      );
      return;
    }

    // 开始自动运行
    State.isAutoRunning = true;
    State.startTime = Date.now();
    State.lastUpdateTime = Date.now();
    button.textContent = "停止";
    showMessage("自动处理已开启", "success");

    // 重置计数（仅在新会话开始时）
    if (State.currentCompany === "") {
      State.processedCount = 0;
      State.successCount = 0;

      // 初始化状态栏
      const statusBar = document.getElementById("mlk-status");
      if (statusBar) {
        statusBar.innerHTML = `<div>准备处理...</div>`;
        statusBar.style.color = "#666";
      }
    }

    // 设置处理定时器
    State.timer = setInterval(async function () {
      try {
        const newCompany = await autoSolveError(State.currentCompany);
        if (newCompany && newCompany !== State.currentCompany) {
          State.currentCompany = newCompany;
        }

        // 检查是否超过30秒没有更新
        if (Date.now() - State.lastUpdateTime > 30000) {
          log("30秒内没有处理新企业，可能遇到问题", "warning");
          State.lastUpdateTime = Date.now();
        }
      } catch (error) {
        log(`自动处理出错: ${error.message}`, "error");
        showMessage("自动处理出错，已停止", "error");
        clearInterval(State.timer);
        clearInterval(State.progressTimer); // 清除进度定时器
        State.isAutoRunning = false;
        State.timer = null;
        State.progressTimer = null;
        button.textContent = "自动";
      }
    }, 3000);

    // 设置进度更新定时器(仅设置一个)
    if (!State.progressTimer) {
      State.progressTimer = setInterval(() => {
        if (State.isAutoRunning) {
          updateProgress();
        }
      }, 1000);
    }
  }

  // 自动解决错误
  async function autoSolveError(companyOld) {
    try {
      // 获取企业名称，而不是流水号
      const companyName = getValueByXpath('//*[@id="dwmc"]/input');
      if (!companyName || companyName === companyOld) return companyOld;

      log(`处理企业: ${companyName}`);

      // 修复错误并检查是否成功
      const fixed = await solveError();

      // 更新处理计数
      if (companyName !== companyOld) {
        State.processedCount++;
        State.lastUpdateTime = Date.now();
      }

      if (!fixed) {
        log("未能修复错误，准备跳过", "warning");

        // 点击"下一个"按钮
        const nextButton = document.evaluate(
          '//*[@id="content"]/section[2]/common-project-bill/common-bill/div/div[1]/common-sequence/div[1]/button[3]',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;

        if (nextButton) {
          nextButton.click();
          log(`已跳过企业: ${companyName}`, "info");
          updateProgress();
          await delay(1000);
          return companyName;
        } else {
          log("未找到下一个按钮", "error");
          return companyOld;
        }
      }

      // 如果修复成功，继续原有流程
      const checkbox = await findCheckbox();
      if (!checkbox) {
        log("未找到复选框", "error");
        return companyOld;
      }

      checkbox.click();
      log("已点击复选框");

      await delay(1000);

      const saveButton = await findSaveButton();
      if (!saveButton) {
        log("未找到保存按钮", "error");
        return companyOld;
      }

      saveButton.click();
      log("已点击保存按钮");

      // 更新成功计数
      State.successCount++;

      // 显示计数消息
      showMessage(`处理成功: ${companyName}`, "success");
      updateProgress();

      return companyName;
    } catch (error) {
      log(`处理企业出错: ${error.message}`, "error");
      throw error;
    }
  }

  // ==================== UI创建函数 ====================
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
    titleBar.textContent = "名录库助手 v2.6";

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

    // 创建状态显示区
    const statusBar = document.createElement("div");
    statusBar.id = "mlk-status";
    statusBar.style.cssText = `
    padding: 10px;
    font-size: 12px;
    text-align: left;
    color: #666;
    border-top: 1px solid #eee;
    height: 40px;
  `;
    statusBar.innerHTML = "<div>就绪</div>";

    // 组装元素
    buttonContainer.appendChild(button1);
    buttonContainer.appendChild(button2);
    helperBox.appendChild(titleBar);
    helperBox.appendChild(buttonContainer);
    helperBox.appendChild(statusBar);

    // 添加版本和作者信息
    const infoBar = document.createElement("div");
    infoBar.style.cssText = `
    padding: 5px;
    font-size: 10px;
    text-align: center;
    color: #999;
    border-top: 1px solid #eee;
  `;
    infoBar.textContent = "by HANJ · 2025";

    helperBox.appendChild(infoBar);
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
        helperBox.style.right = "auto";
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });

    // 添加到页面
    document.body.appendChild(helperBox);

    // 显示欢迎消息
    showMessage("名录库助手已启动", "info");
  }
  // 增强日志输出
  function log(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    const colorMap = {
      info: "color: #2196F3",
      success: "color: #4CAF50",
      error: "color: #F44336",
      warning: "color: #FF9800",
    };

    console.log(`%c[${timestamp}] ${message}`, colorMap[type]);

    // 同时更新状态栏
    updateStatusText(`${message}`);
  }
  // 更新状态栏文本（不会自动消失）
  function updateStatusText(text) {
    const statusBar = document.getElementById("mlk-status");
    if (statusBar) {
      statusBar.textContent = text;
    }
  }
  // 更新进度函数
  function updateProgress() {
    const elapsed = Math.floor((Date.now() - State.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeStr = `${minutes}分${seconds}秒`;

    // 计算处理速度
    const recordsPerMinute =
      State.processedCount > 0
        ? (State.processedCount / (elapsed / 60)).toFixed(1)
        : "0.0";

    const statusBar = document.getElementById("mlk-status");
    if (statusBar) {
      statusBar.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
        <span>企业数: ${State.processedCount}</span>
        <span>成功: ${State.successCount}</span>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span>运行: ${timeStr}</span>
        <span>速度: ${recordsPerMinute}家/分</span>
      </div>
    `;

      // 根据成功率改变状态栏颜色
      const successRate =
        State.processedCount > 0
          ? State.successCount / State.processedCount
          : 0;

      if (successRate >= 0.8) {
        statusBar.style.color = "#4CAF50"; // 绿色
      } else if (successRate >= 0.5) {
        statusBar.style.color = "#FF9800"; // 橙色
      } else if (State.processedCount > 0) {
        statusBar.style.color = "#F44336"; // 红色
      }
    }
  }
  // ==================== 初始化 ====================
  // 创建助手盒子
  createHelperBox();
})();
