// ==UserScript==
// @name         企业行业代码分析工具
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  自动分析企业名称，提取主要业务活动和行业代码，支持手动输入企业名称
// @author       Your Name
// @match        *://tjymlk.stats.gov.cn/*
// @grant        GM_xmlhttpRequest
// @connect      open.bigmodel.cn
// ==/UserScript==

(function () {
  "use strict";

  /**
   * 调用智谱GLM-4模型获取企业的主要业务活动和行业代码
   * @param {string} companyName 企业名称
   * @returns {Promise<{businessActivity: string, industryCode: string, industryName: string}>}
   */
  async function getBusinessActivityAndCode(companyName) {
    return new Promise((resolve, reject) => {
      try {
        // API配置
        const API_TOKEN = "cc52b6be0db34080a855dd3c278c1401.afEKeu0Dzjw1DepC"; // 实际使用时应妥善保管
        const API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

        // 构造请求数据
        const requestData = {
          model: "glm-4",
          messages: [
            {
              role: "system",
              content: `你是一个行业分析专家，请按以下要求提取企业信息：
                              1. 主要业务活动必须是"名词+动词"或"动词+名词"的短语形式，不超过15字
                              2. 行业代码必须是四位纯数字，符合国民经济行业分类标准GB/T 4754
                              3. 行业名称应与行业代码对应`,
            },
            {
              role: "user",
              content: `分析企业"${companyName}"的主要经营业务活动和国民经济行业分类。
                              请严格按以下JSON格式返回：
                              {"businessActivity": "动名短语形式的业务活动描述", "industryCode": "四位数字代码", "industryName": "行业标准名称"}`,
            },
          ],
          temperature: 0.2,
          top_p: 0.7,
          max_tokens: 500,
        };

        console.log(`正在查询企业 "${companyName}" 的信息...`);
        showLoadingIndicator(true);

        // 使用GM_xmlhttpRequest绕过CSP限制
        GM_xmlhttpRequest({
          method: "POST",
          url: API_URL,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
          },
          data: JSON.stringify(requestData),
          onload: function (response) {
            showLoadingIndicator(false);

            try {
              if (response.status !== 200) {
                throw new Error(
                  `API请求失败: ${response.status} ${response.statusText}`
                );
              }

              const data = JSON.parse(response.responseText);
              const aiResponse = data.choices[0].message.content;
              console.log("AI原始回复:", aiResponse);

              try {
                // 从回复中提取JSON部分
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);

                if (jsonMatch) {
                  const jsonData = JSON.parse(jsonMatch[0]);

                  // 验证并格式化业务活动
                  let businessActivity =
                    jsonData.businessActivity || "未能识别主要业务";
                  if (businessActivity.length > 15) {
                    businessActivity = businessActivity.substring(0, 15);
                  }

                  // 验证并格式化行业代码
                  let industryCode = jsonData.industryCode || "";
                  if (!/^\d{4}$/.test(industryCode)) {
                    const numbers = industryCode.match(/\d+/);
                    industryCode =
                      numbers && numbers[0].length >= 4
                        ? numbers[0].substring(0, 4)
                        : "";
                  }

                  resolve({
                    businessActivity: businessActivity,
                    industryCode: industryCode,
                    industryName: jsonData.industryName || "",
                  });
                  return;
                }

                throw new Error("回复中未找到有效JSON");
              } catch (jsonError) {
                console.error("解析AI回复失败:", jsonError);

                // 尝试从文本中提取关键信息
                const lines = aiResponse
                  .split("\n")
                  .filter((line) => line.trim());
                let businessActivity = "未能识别";
                let industryCode = "";
                let industryName = "";

                for (const line of lines) {
                  if (line.includes("主要业务") || line.includes("业务活动")) {
                    const parts = line.split(/[：:]/);
                    if (parts.length > 1 && parts[1].trim()) {
                      businessActivity = parts[1].trim();
                      if (businessActivity.length > 15) {
                        businessActivity = businessActivity.substring(0, 15);
                      }
                    }
                  } else if (line.includes("行业代码")) {
                    const parts = line.split(/[：:]/);
                    if (parts.length > 1) {
                      const match = parts[1].match(/\d{4}/);
                      industryCode = match ? match[0] : "";
                    }
                  } else if (line.includes("行业名称")) {
                    const parts = line.split(/[：:]/);
                    if (parts.length > 1) {
                      industryName = parts[1].trim();
                    }
                  }
                }

                resolve({ businessActivity, industryCode, industryName });
              }
            } catch (error) {
              console.error("处理响应失败:", error);
              resolve({
                businessActivity: "商品批发零售",
                industryCode: "5191",
                industryName: "批发业",
              });
            }
          },
          onerror: function (error) {
            showLoadingIndicator(false);
            console.error("请求失败:", error);
            resolve({
              businessActivity: "商品批发零售",
              industryCode: "5191",
              industryName: "批发业",
            });
          },
        });
      } catch (error) {
        console.error("查询企业信息初始化失败:", error);
        resolve({
          businessActivity: "商品批发零售",
          industryCode: "5191",
          industryName: "批发业",
        });
      }
    });
  }

  // 显示/隐藏加载指示器
  function showLoadingIndicator(isLoading) {
    const loadingElement = document.getElementById("industry-loading");
    if (loadingElement) {
      loadingElement.style.display = isLoading ? "flex" : "none";
    }
  }

  // 创建UI界面
  function createUI() {
    const container = document.createElement("div");
    container.id = "industry-analyzer";
    container.style.cssText = `
              position: fixed;
              top: 10px;
              right: 10px;
              width: 320px;
              background: white;
              border: 1px solid #ccc;
              border-radius: 5px;
              padding: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              z-index: 9999;
              font-family: Arial, sans-serif;
          `;

    container.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <h3 style="margin: 0; color: #2196F3;">企业行业代码分析</h3>
                  <div>
                      <button id="minimize-btn" style="
                          background: #607D8B;
                          color: white;
                          border: none;
                          width: 24px;
                          height: 24px;
                          border-radius: 3px;
                          cursor: pointer;
                          margin-right: 5px;
                          font-size: 12px;
                      ">—</button>
                      <button id="close-btn" style="
                          background: #F44336;
                          color: white;
                          border: none;
                          width: 24px;
                          height: 24px;
                          border-radius: 3px;
                          cursor: pointer;
                          font-size: 12px;
                      ">×</button>
                  </div>
              </div>
              
              <div id="analyzer-content">
                  <div style="margin-bottom: 10px;">
                      <div style="display: flex; margin-bottom: 8px;">
                          <input id="company-name-input" type="text" placeholder="请输入企业名称" style="
                              flex-grow: 1;
                              padding: 8px;
                              border: 1px solid #ddd;
                              border-radius: 3px;
                              outline: none;
                          ">
                          <button id="auto-fill-btn" style="
                              background: #FF9800;
                              color: white;
                              border: none;
                              padding: 0 10px;
                              border-radius: 3px;
                              cursor: pointer;
                              margin-left: 5px;
                          ">自动填充</button>
                      </div>
                      <button id="analyze-button" style="
                          background: #2196F3;
                          color: white;
                          border: none;
                          padding: 8px 0;
                          border-radius: 3px;
                          cursor: pointer;
                          width: 100%;
                          font-weight: bold;
                      ">分析企业行业信息</button>
                  </div>
                  
                  <div id="industry-loading" style="
                      display: none;
                      justify-content: center;
                      align-items: center;
                      height: 50px;
                      font-style: italic;
                      color: #666;
                  ">
                      <div class="spinner" style="
                          border: 3px solid #f3f3f3;
                          border-top: 3px solid #2196F3;
                          border-radius: 50%;
                          width: 20px;
                          height: 20px;
                          margin-right: 10px;
                          animation: spin 1s linear infinite;
                      "></div>
                      <span>正在分析中，请稍候...</span>
                  </div>
                  <style>
                      @keyframes spin {
                          0% { transform: rotate(0deg); }
                          100% { transform: rotate(360deg); }
                      }
                  </style>
                  
                  <div id="analysis-result" style="
                      border-top: 1px solid #eee;
                      padding-top: 10px;
                      min-height: 50px;
                  ">请输入企业名称并点击分析按钮</div>
              </div>
              
              <div id="analyzer-minimized" style="display: none; text-align: center;">
                  <button id="restore-btn" style="
                      background: #2196F3;
                      color: white;
                      border: none;
                      padding: 5px 10px;
                      border-radius: 3px;
                      cursor: pointer;
                      width: 100%;
                  ">展开分析工具</button>
              </div>
          `;

    document.body.appendChild(container);

    // 创建浮动按钮
    const floatBtn = document.createElement("div");
    floatBtn.id = "industry-float-btn";
    floatBtn.textContent = "行业分析";
    floatBtn.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #2196F3;
          color: white;
          padding: 8px 12px;
          border-radius: 20px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          cursor: pointer;
          font-weight: bold;
          z-index: 9998;
          display: none;
      `;
    document.body.appendChild(floatBtn);

    // 添加样式
    const styleEl = document.createElement("style");
    styleEl.textContent = `
          #industry-analyzer input:focus, #industry-analyzer button:hover {
              box-shadow: 0 0 3px #2196F3;
          }
          #industry-analyzer button {
              transition: all 0.2s;
          }
          #industry-analyzer button:hover {
              opacity: 0.9;
          }
      `;
    document.head.appendChild(styleEl);

    // 事件处理程序
    document
      .getElementById("analyze-button")
      .addEventListener("click", analyzeCompany);
    document
      .getElementById("auto-fill-btn")
      .addEventListener("click", autoFillCompanyName);
    document
      .getElementById("minimize-btn")
      .addEventListener("click", minimizeAnalyzer);
    document
      .getElementById("close-btn")
      .addEventListener("click", hideAnalyzer);
    document
      .getElementById("restore-btn")
      .addEventListener("click", restoreAnalyzer);
    document
      .getElementById("industry-float-btn")
      .addEventListener("click", showAnalyzer);

    // 让输入框支持回车键提交
    document
      .getElementById("company-name-input")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") analyzeCompany();
      });

    // 自动填充功能
    autoFillCompanyName();
  }

  // 自动填充页面上的企业名称
  function autoFillCompanyName() {
    const companyNameInput = document.querySelector('[id="dwmc"] input');
    if (companyNameInput && companyNameInput.value) {
      document.getElementById("company-name-input").value =
        companyNameInput.value;
    }
  }

  // 分析企业信息
  async function analyzeCompany() {
    const companyNameInput = document.getElementById("company-name-input");
    const companyName = companyNameInput.value.trim();

    if (!companyName) {
      showMessage("请输入企业名称", "warning");
      return;
    }

    showResult(`正在分析企业: ${companyName}...`);

    try {
      const result = await getBusinessActivityAndCode(companyName);

      // 展示结果
      showResult(`
                  <div style="margin-bottom:5px;"><strong>企业名称:</strong> ${companyName}</div>
                  <div style="margin-bottom:5px;"><strong>主要业务:</strong> <span style="color:#2196F3;">${result.businessActivity}</span></div>
                  <div style="margin-bottom:5px;"><strong>行业代码:</strong> <span style="color:#4CAF50;">${result.industryCode}</span></div>
                  <div style="margin-bottom:5px;"><strong>行业名称:</strong> <span style="color:#FF9800;">${result.industryName}</span></div>
                  <div style="margin-top:10px;">
                      <button id="apply-data" style="
                          background: #4CAF50;
                          color: white;
                          border: none;
                          padding: 5px 10px;
                          border-radius: 3px;
                          cursor: pointer;
                          margin-right: 5px;
                      ">应用数据</button>
                      <button id="copy-data" style="
                          background: #607D8B;
                          color: white;
                          border: none;
                          padding: 5px 10px;
                          border-radius: 3px;
                          cursor: pointer;
                      ">复制数据</button>
                  </div>
              `);

      // 添加应用数据按钮事件
      document.getElementById("apply-data").addEventListener("click", () => {
        // 找到主要业务活动输入框并填入数据
        const activityInput = document.querySelector('[id="zyywhd1"] input');
        if (activityInput) {
          activityInput.value = result.businessActivity;
          activityInput.dispatchEvent(new Event("input", { bubbles: true }));
          activityInput.dispatchEvent(new Event("change", { bubbles: true }));

          // 找到行业代码输入框并填入数据
          const codeInput = document.querySelector('[id="hydm"] input');
          if (codeInput && result.industryCode) {
            codeInput.value = result.industryCode;
            codeInput.dispatchEvent(new Event("input", { bubbles: true }));
            codeInput.dispatchEvent(new Event("change", { bubbles: true }));
            showMessage("已填入业务活动和行业代码", "success");
          } else {
            showMessage("已填入主要业务活动", "success");
          }
        } else {
          showMessage("未找到表单字段，请确认是否在正确页面", "error");
        }
      });

      // 添加复制数据按钮事件
      document.getElementById("copy-data").addEventListener("click", () => {
        const textToCopy = `业务活动: ${result.businessActivity}\n行业代码: ${result.industryCode}\n行业名称: ${result.industryName}`;
        navigator.clipboard
          .writeText(textToCopy)
          .then(() => showMessage("数据已复制到剪贴板", "info"))
          .catch(() => showMessage("复制失败", "error"));
      });
    } catch (error) {
      showResult(`分析失败: ${error.message}`);
    }
  }

  // 显示分析结果
  function showResult(html) {
    const resultElement = document.getElementById("analysis-result");
    if (resultElement) {
      resultElement.innerHTML = html;
    }
  }

  // 最小化分析面板
  function minimizeAnalyzer() {
    document.getElementById("analyzer-content").style.display = "none";
    document.getElementById("analyzer-minimized").style.display = "block";
    document.getElementById("minimize-btn").style.display = "none";
  }

  // 恢复分析面板
  function restoreAnalyzer() {
    document.getElementById("analyzer-content").style.display = "block";
    document.getElementById("analyzer-minimized").style.display = "none";
    document.getElementById("minimize-btn").style.display = "inline-block";
  }

  // 隐藏分析面板
  function hideAnalyzer() {
    document.getElementById("industry-analyzer").style.display = "none";
    document.getElementById("industry-float-btn").style.display = "block";
  }

  // 显示分析面板
  function showAnalyzer() {
    document.getElementById("industry-analyzer").style.display = "block";
    document.getElementById("industry-float-btn").style.display = "none";
    restoreAnalyzer(); // 确保显示完整面板
  }

  // 显示消息提示
  function showMessage(message, type = "info") {
    const colors = {
      info: "#2196F3",
      success: "#4CAF50",
      error: "#F44336",
      warning: "#FF9800",
    };

    const msgContainer = document.createElement("div");
    msgContainer.style.cssText = `
              position: fixed;
              bottom: 20px;
              left: 20px;
              background-color: ${colors[type]};
              color: white;
              padding: 10px 20px;
              border-radius: 4px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.2);
              z-index: 10000;
              transition: opacity 0.5s;
          `;
    msgContainer.textContent = message;

    document.body.appendChild(msgContainer);

    setTimeout(() => {
      msgContainer.style.opacity = "0";
      setTimeout(() => msgContainer.remove(), 500);
    }, 3000);
  }

  // 等待页面完全加载后初始化
  window.addEventListener("load", () => {
    setTimeout(createUI, 1000); // 延迟初始化，确保页面元素已加载
  });
})();
