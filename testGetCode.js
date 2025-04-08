// ==UserScript==
// @name         浙江自动编码系统API访问助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  跨域访问浙江省自动编码系统API获取行业代码信息
// @author       Your Name
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @connect      jcfx.tjj.zj.gov.cn
// ==/UserScript==

(function () {
  "use strict";

  // 脚本状态管理
  const State = {
    lastSearchTerm: GM_getValue("lastSearchTerm", ""),
    searchHistory: JSON.parse(GM_getValue("searchHistory", "[]")),
    isVisible: false,
  };

  // 创建UI
  function createUI() {
    // 创建主容器
    const container = document.createElement("div");
    container.id = "zj-industry-helper";
    container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: white;
            border: 1px solid #ccc;
            border-radius: 5px;
            padding: 15px;
            width: 380px;
            max-height: 600px;
            overflow-y: auto;
            z-index: 10000;
            box-shadow: 0 0 15px rgba(0,0,0,0.2);
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            display: none;
        `;

    container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #1890ff;">浙江行业代码查询</h3>
                <button id="zj-api-close" style="
                    background: none;
                    border: none;
                    font-size: 16px;
                    cursor: pointer;
                    color: #999;
                ">×</button>
            </div>
            
            <div style="margin-bottom: 15px;">
                <div style="display: flex; margin-bottom: 8px;">
                    <input id="zj-search-input" type="text" placeholder="输入企业名称、经营范围或行业关键词" style="
                        flex-grow: 1;
                        padding: 8px 12px;
                        border: 1px solid #d9d9d9;
                        border-radius: 4px;
                        outline: none;
                    " value="${State.lastSearchTerm}">
                    <button id="zj-search-btn" style="
                        background-color: #1890ff;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        margin-left: 8px;
                        border-radius: 4px;
                        cursor: pointer;
                    ">查询</button>
                </div>
                <div style="color: #888; font-size: 12px;">示例：餐饮、软件开发、食品制造、医疗器械批发等</div>
            </div>
            
            <div id="zj-loading" style="
                display: none;
                text-align: center;
                padding: 20px;
                color: #666;
            ">
                <div style="
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #1890ff;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    animation: zj-spin 1s linear infinite;
                    margin: 0 auto 10px auto;
                "></div>
                正在查询中...
            </div>
            
            <div id="zj-results" style="
                border-top: 1px solid #eee;
                padding-top: 15px;
                max-height: 400px;
                overflow-y: auto;
            ">
                <div style="color: #666; text-align: center;">请输入关键词进行查询</div>
            </div>
            
            <div style="margin-top: 15px; font-size: 12px; color: #999; text-align: center;">
                数据来源：浙江省自动编码系统
            </div>
            
            <style>
                @keyframes zj-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                #zj-industry-helper input:focus {
                    border-color: #40a9ff;
                    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
                }
                
                #zj-industry-helper button:hover {
                    opacity: 0.9;
                }
                
                #zj-results .result-item:hover {
                    background-color: #f5f5f5;
                }
                
                #zj-history-list {
                    padding-left: 0;
                    list-style-type: none;
                    margin-bottom: 10px;
                }
                
                #zj-history-list li {
                    padding: 5px 8px;
                    cursor: pointer;
                    border-radius: 3px;
                }
                
                #zj-history-list li:hover {
                    background-color: #f0f0f0;
                }
            </style>
        `;

    document.body.appendChild(container);

    // 创建悬浮按钮
    const floatBtn = document.createElement("div");
    floatBtn.id = "zj-industry-float-btn";
    floatBtn.textContent = "行业代码查询";
    floatBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #1890ff;
            color: white;
            padding: 10px 15px;
            border-radius: 25px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            cursor: pointer;
            z-index: 9999;
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            font-size: 14px;
        `;

    document.body.appendChild(floatBtn);

    // 绑定事件
    document
      .getElementById("zj-search-btn")
      .addEventListener("click", handleSearch);
    document
      .getElementById("zj-search-input")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSearch();
      });
    document.getElementById("zj-api-close").addEventListener("click", () => {
      document.getElementById("zj-industry-helper").style.display = "none";
      State.isVisible = false;
    });
    floatBtn.addEventListener("click", () => {
      const container = document.getElementById("zj-industry-helper");
      container.style.display = "block";
      State.isVisible = true;
      document.getElementById("zj-search-input").focus();

      // 更新搜索历史
      showSearchHistory();
    });

    // 初始聚焦
    document.getElementById("zj-search-input").focus();
  }

  // 处理搜索请求
  function handleSearch() {
    const searchInput = document.getElementById("zj-search-input");
    const searchTerm = searchInput.value.trim();

    if (!searchTerm) {
      showMessage("请输入搜索关键词");
      return;
    }

    // 保存搜索词
    State.lastSearchTerm = searchTerm;
    GM_setValue("lastSearchTerm", searchTerm);

    // 添加到搜索历史
    if (!State.searchHistory.includes(searchTerm)) {
      State.searchHistory.unshift(searchTerm);
      if (State.searchHistory.length > 10) {
        State.searchHistory.pop();
      }
      GM_setValue("searchHistory", JSON.stringify(State.searchHistory));
    }

    // 显示加载状态
    document.getElementById("zj-loading").style.display = "block";
    document.getElementById("zj-results").innerHTML = "";

    // 发起请求
    fetchIndustryData(searchTerm);
  }

  // 从API获取行业数据
  function fetchIndustryData(searchTerm) {
    // 对搜索词进行URL编码，确保中文字符正确传递
    const encodedSearchTerm = encodeURIComponent(searchTerm);
    const apiUrl = `https://jcfx.tjj.zj.gov.cn:6443/autocode-clusterapi-pub/api/stats/query/mobile/des/${encodedSearchTerm}/5`;

    GM_xmlhttpRequest({
      method: "GET",
      url: apiUrl,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      onload: function (response) {
        document.getElementById("zj-loading").style.display = "none";

        try {
          if (response.status !== 200) {
            showAPIError("服务器返回错误状态码：" + response.status);
            return;
          }

          const data = JSON.parse(response.responseText);
          console.log("API响应:", data);

          // 新的响应格式处理逻辑
          if (
            !data ||
            data.code !== "00000" ||
            !data.data ||
            !data.data.Codes
          ) {
            showAPIError(
              `API返回数据格式不正确或存在错误: ${data.msg || "未知错误"}`
            );
            return;
          }

          // 使用 data.data.Codes 作为结果数组
          displayResults(data.data.Codes, searchTerm);
        } catch (error) {
          console.error("解析API响应失败:", error);
          showAPIError("解析返回数据失败：" + error.message);
        }
      },
      onerror: function (error) {
        document.getElementById("zj-loading").style.display = "none";
        showAPIError("请求失败：" + (error.statusText || "无法连接到服务器"));
      },
    });
  }

  // 显示API错误
  function showAPIError(message) {
    const resultsContainer = document.getElementById("zj-results");
    resultsContainer.innerHTML = `
            <div style="color: #f5222d; text-align: center; padding: 20px;">
                <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
                <div>${message}</div>
                <button id="zj-retry-btn" style="
                    background-color: #1890ff;
                    color: white;
                    border: none;
                    padding: 5px 15px;
                    border-radius: 4px;
                    margin-top: 15px;
                    cursor: pointer;
                ">重试</button>
            </div>
        `;

    document
      .getElementById("zj-retry-btn")
      .addEventListener("click", handleSearch);
  }

  // 显示结果
  function displayResults(results, searchTerm) {
    const resultsContainer = document.getElementById("zj-results");

    if (!results.length) {
      resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666;">
                    没有找到与"${searchTerm}"相关的行业代码。
                    <div style="margin-top: 10px; font-size: 13px;">
                        尝试使用更简短或更常见的关键词，如"餐饮"、"制造"等。
                    </div>
                </div>
            `;
      return;
    }

    let html = `
        <div style="margin-bottom: 15px; color: #333;">
            找到 <b>${results.length}</b> 个与"${searchTerm}"相关的行业分类：
        </div>
    `;

    html += `<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse;">
        <thead>
            <tr>
                <th style="text-align: center; padding: 8px; border-bottom: 2px solid #e8e8e8;">行业代码</th>
                <th style="text-align: left; padding: 8px; border-bottom: 2px solid #e8e8e8;">行业名称</th>
                <th style="text-align: center; padding: 8px; border-bottom: 2px solid #e8e8e8;">行业大类</th>
                <th style="text-align: center; padding: 8px; border-bottom: 2px solid #e8e8e8;">操作</th>
            </tr>
        </thead>
        <tbody>`;

    results.forEach((item, index) => {
      // 新的数据结构映射
      const code = item.Code || "";
      const name = item.Name || "";
      const category = item.Category || "";
      const weight = item.Weight ? `(权重: ${item.Weight.toFixed(2)})` : "";

      // 根据不同行业给不同颜色标识
      let codeColorClass = "";
      if (code) {
        const firstDigit = code.toString().charAt(0);
        if (["1", "2", "3"].includes(firstDigit)) codeColorClass = "#1890ff";
        else if (["4", "5"].includes(firstDigit)) codeColorClass = "#52c41a";
        else if (["6", "7"].includes(firstDigit)) codeColorClass = "#722ed1";
        else if (["8", "9"].includes(firstDigit)) codeColorClass = "#faad14";
        else codeColorClass = "#f5222d";
      }

      html += `
            <tr class="result-item" style="
                border-bottom: 1px solid #e8e8e8;
                ${index % 2 === 0 ? "background-color: #fafafa;" : ""}
            ">
                <td style="text-align: center; padding: 12px 8px; color: ${codeColorClass}; font-weight: bold;">${code}</td>
                <td style="text-align: left; padding: 12px 8px;">
                    <div style="font-weight: 500;">${name}</div>
                    <div style="font-size: 12px; color: #666; margin-top: 3px;">${weight}</div>
                </td>
                <td style="text-align: center; padding: 12px 8px; color: #666;">
                    ${category}
                </td>
                <td style="text-align: center; padding: 12px 8px;">
                    <button class="zj-copy-btn" data-code="${code}" data-name="${name}" data-category="${category}" style="
                        background-color: #fff;
                        color: #1890ff;
                        border: 1px solid #1890ff;
                        border-radius: 4px;
                        padding: 4px 8px;
                        cursor: pointer;
                    ">复制</button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;

    resultsContainer.innerHTML = html;

    // 绑定复制按钮事件
    document.querySelectorAll(".zj-copy-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const code = this.getAttribute("data-code");
        const name = this.getAttribute("data-name");
        const category = this.getAttribute("data-category");

        const copyText = `${code} ${name} (${category})`;
        copyToClipboard(copyText);
      });
    });
  }

  // 显示搜索历史
  function showSearchHistory() {
    if (!State.searchHistory || State.searchHistory.length === 0) return;

    const resultsContainer = document.getElementById("zj-results");
    let html = `
            <div style="margin-bottom: 10px; color: #666;">最近搜索：</div>
            <ul id="zj-history-list">
        `;

    State.searchHistory.forEach((term) => {
      html += `<li data-term="${term}">${term}</li>`;
    });

    html += `</ul>`;
    resultsContainer.innerHTML = html;

    // 绑定历史记录点击事件
    document.querySelectorAll("#zj-history-list li").forEach((item) => {
      item.addEventListener("click", function () {
        const term = this.getAttribute("data-term");
        document.getElementById("zj-search-input").value = term;
        handleSearch();
      });
    });
  }

  // 复制到剪贴板
  function copyToClipboard(text) {
    navigator.clipboard
      .writeText(text)
      .then(() => showMessage("已复制到剪贴板: " + text))
      .catch((err) => {
        console.error("复制失败: ", err);
        showMessage("复制失败，请手动复制");
      });
  }

  // 显示消息提示
  function showMessage(message) {
    const msgContainer = document.createElement("div");
    msgContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 10001;
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            font-size: 14px;
            transition: opacity 0.3s;
        `;
    msgContainer.textContent = message;

    document.body.appendChild(msgContainer);

    setTimeout(() => {
      msgContainer.style.opacity = "0";
      setTimeout(() => {
        if (msgContainer.parentNode) {
          msgContainer.parentNode.removeChild(msgContainer);
        }
      }, 300);
    }, 2000);
  }

  // 注册菜单命令
  GM_registerMenuCommand("打开行业代码查询", function () {
    const container = document.getElementById("zj-industry-helper");
    if (container) {
      container.style.display = "block";
      State.isVisible = true;
      document.getElementById("zj-search-input").focus();
      showSearchHistory();
    } else {
      createUI();
      State.isVisible = true;
      showSearchHistory();
    }
  });

  // 页面加载完成后初始化
  window.addEventListener("load", function () {
    setTimeout(createUI, 1000);
  });
})();
