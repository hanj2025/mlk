// ==UserScript==
// @name         API跨域访问助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  演示如何使用油猴脚本进行跨域API访问
// @author       您的名字
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @connect      api.weatherapi.com
// ==/UserScript==

(function () {
  "use strict";

  // 创建UI
  function createUI() {
    // 创建主容器
    const container = document.createElement("div");
    container.id = "api-access-helper";
    container.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          background-color: white;
          border: 1px solid #ccc;
          border-radius: 5px;
          padding: 10px;
          width: 300px;
          z-index: 10000;
          box-shadow: 0 0 10px rgba(0,0,0,0.2);
          font-family: Arial, sans-serif;
      `;

    // 创建标题
    const title = document.createElement("h3");
    title.textContent = "API访问助手";
    title.style.margin = "0 0 10px 0";

    // 创建输入框
    const inputContainer = document.createElement("div");
    inputContainer.style.marginBottom = "10px";

    const locationInput = document.createElement("input");
    locationInput.type = "text";
    locationInput.id = "location-input";
    locationInput.placeholder = "输入城市名称 (如: Beijing)";
    locationInput.style.cssText = `
          width: 100%;
          padding: 5px;
          box-sizing: border-box;
          margin-bottom: 5px;
      `;
    locationInput.value = GM_getValue("lastLocation", "Beijing");

    // 创建按钮
    const fetchButton = document.createElement("button");
    fetchButton.textContent = "获取天气数据";
    fetchButton.style.cssText = `
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 5px;
      `;

    const hideButton = document.createElement("button");
    hideButton.textContent = "隐藏";
    hideButton.style.cssText = `
          background-color: #f44336;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 4px;
          cursor: pointer;
      `;

    // 创建结果区域
    const resultArea = document.createElement("div");
    resultArea.id = "api-result-area";
    resultArea.style.cssText = `
          margin-top: 10px;
          max-height: 200px;
          overflow-y: auto;
          padding: 5px;
          background-color: #f5f5f5;
          border-radius: 4px;
          display: none;
      `;

    // 组装UI
    inputContainer.appendChild(locationInput);

    container.appendChild(title);
    container.appendChild(inputContainer);
    container.appendChild(fetchButton);
    container.appendChild(hideButton);
    container.appendChild(resultArea);

    document.body.appendChild(container);

    // 添加事件监听器
    fetchButton.addEventListener("click", () => {
      const location = locationInput.value.trim();
      if (location) {
        GM_setValue("lastLocation", location);
        fetchWeatherData(location);
      } else {
        showResult("请输入有效的城市名称", true);
      }
    });

    hideButton.addEventListener("click", () => {
      container.style.display = "none";
    });

    // 创建浮动按钮以重新显示面板
    const floatBtn = document.createElement("div");
    floatBtn.textContent = "API";
    floatBtn.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 40px;
          height: 40px;
          background-color: #2196F3;
          color: white;
          border-radius: 50%;
          text-align: center;
          line-height: 40px;
          cursor: pointer;
          z-index: 9999;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          display: none;
      `;

    document.body.appendChild(floatBtn);

    floatBtn.addEventListener("click", () => {
      container.style.display = "block";
      floatBtn.style.display = "none";
    });

    // 当面板隐藏时显示浮动按钮
    new MutationObserver(() => {
      if (container.style.display === "none") {
        floatBtn.style.display = "block";
      }
    }).observe(container, { attributes: true, attributeFilter: ["style"] });
  }

  // 使用GM_xmlhttpRequest进行跨域API请求
  function fetchWeatherData(location) {
    const resultArea = document.getElementById("api-result-area");
    resultArea.style.display = "block";
    resultArea.innerHTML = "正在加载...";

    // 使用weatherapi.com的真实API
    // 请替换为您自己的API密钥，可以在这里免费获取: https://www.weatherapi.com/
    const apiKey = "ecc94d9ab7b7473581f23630252003";
    const apiUrl = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(
      location
    )}&aqi=no`;

    GM_xmlhttpRequest({
      method: "GET",
      url: apiUrl,
      headers: {
        Accept: "application/json",
      },
      onload: function (response) {
        try {
          const data = JSON.parse(response.responseText);
          if (data.error) {
            showResult(`错误: ${data.error.message}`, true);
          } else {
            displayWeatherData(data);
          }
        } catch (error) {
          showResult(`解析错误: ${error.message}`, true);
        }
      },
      onerror: function (error) {
        showResult(`请求错误: ${error.statusText || "无法连接服务器"}`, true);
      },
    });
  }

  // 显示天气数据
  function displayWeatherData(data) {
    const resultArea = document.getElementById("api-result-area");

    // 从API响应中提取相关数据
    const location = data.location;
    const current = data.current;

    // 创建美观的天气信息展示
    const html = `
          <div style="text-align: center; margin-bottom: 10px;">
              <h3 style="margin: 0;">${location.name}, ${location.country}</h3>
              <div style="color: #666;">${location.localtime}</div>
          </div>
          <div style="display: flex; align-items: center; justify-content: center;">
              <img src="${current.condition.icon}" alt="${current.condition.text}" style="width: 64px; height: 64px;">
              <div style="margin-left: 10px; font-size: 24px;">
                  ${current.temp_c}°C
              </div>
          </div>
          <div style="text-align: center; margin-top: 5px;">
              ${current.condition.text}
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 10px;">
              <div>湿度: ${current.humidity}%</div>
              <div>风速: ${current.wind_kph} km/h</div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 5px;">
              <div>体感温度: ${current.feelslike_c}°C</div>
              <div>可见度: ${current.vis_km} km</div>
          </div>
      `;

    resultArea.innerHTML = html;
    resultArea.style.display = "block";
  }

  // 显示结果信息
  function showResult(message, isError = false) {
    const resultArea = document.getElementById("api-result-area");
    resultArea.innerHTML = `<div style="color: ${
      isError ? "red" : "black"
    }">${message}</div>`;
    resultArea.style.display = "block";
  }

  // 为脚本添加菜单命令
  GM_registerMenuCommand("显示API访问助手", function () {
    const container = document.getElementById("api-access-helper");
    if (container) {
      container.style.display = "block";
      document.querySelector("#api-access-helper + div").style.display = "none";
    } else {
      createUI();
    }
  });

  // 页面加载完成后执行
  window.addEventListener("load", function () {
    // 延迟初始化以确保页面已完全加载
    setTimeout(createUI, 1500);
  });
})();
