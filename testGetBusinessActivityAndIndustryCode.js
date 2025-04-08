/**
 * 企业信息分析工具函数库
 * 提供企业名称分析、业务活动提取和行业代码查询功能
 *
 * @author Your Name
 * @version 1.0
 */

/**
 * 主函数：分析企业名称，返回业务活动和行业代码
 * @param {string} companyName - 企业或事业单位名称
 * @returns {Promise<Object>} - 返回包含业务活动和行业代码的对象
 */
async function analyzeCompany(companyName) {
  try {
    // 步骤1：通过AI获取主要业务活动
    const activityResult = await getBusinessActivityFromAI(companyName);

    // 步骤2：通过业务活动获取行业代码
    const industryResult = await getIndustryCodeFromAPI(
      activityResult.businessActivity
    );

    // 返回组合结果
    return {
      companyName: companyName,
      businessActivity: activityResult.businessActivity,
      industryCode: industryResult.code,
      industryName: industryResult.name,
      industryCategory: industryResult.category,
      success: true,
    };
  } catch (error) {
    console.error(`分析企业 "${companyName}" 时发生错误:`, error);
    return {
      companyName: companyName,
      businessActivity: "",
      industryCode: "",
      industryName: "",
      industryCategory: "",
      success: false,
      error: error.message,
    };
  }
}

/**
 * 通过智谱AI获取企业主要业务活动
 * @param {string} companyName - 企业名称
 * @returns {Promise<Object>} - {businessActivity: string}
 */
function getBusinessActivityFromAI(companyName) {
  return new Promise((resolve, reject) => {
    // API配置
    const API_TOKEN = "cc52b6be0db34080a855dd3c278c1401.afEKeu0Dzjw1DepC"; // 需要替换为您自己的API密钥
    const API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

    // 构造请求数据
    const requestData = {
      model: "glm-4",
      messages: [
        {
          role: "system",
          content: `你是一个行业分析专家，请依据企业/单位名称分析其主要业务活动。
                        要求：
                        1. 主要业务活动必须是"名词+动词"或"动词+名词"的短语形式，不超过8字
                        2. 必须具体明确，避免模糊表述
                        3. 行政/事业单位应体现其职能定位`,
        },
        {
          role: "user",
          content: `请分析"${companyName}"的主要业务活动，只需返回一个简洁的业务活动短语，格式为名词+动词或动词+名词，不需要其他任何解释或说明。`,
        },
      ],
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 100,
    };

    // 使用GM_xmlhttpRequest实现跨域请求
    GM_xmlhttpRequest({
      method: "POST",
      url: API_URL,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      data: JSON.stringify(requestData),
      onload: function (response) {
        try {
          if (response.status !== 200) {
            reject(
              new Error(
                `AI API请求失败: ${response.status} ${response.statusText}`
              )
            );
            return;
          }

          const data = JSON.parse(response.responseText);
          const aiResponse = data.choices[0].message.content.trim();

          // 清理AI回复，提取核心业务活动描述
          let businessActivity = aiResponse
            .replace(/["""'''\(\)（）\[\]【】\{\}]/g, "") // 移除引号和括号
            .replace(/^主要业务活动[是为：:]\s*/, "") // 移除开头的"主要业务活动是"等
            .replace(/。$/, "") // 移除结尾的句号
            .trim();

          // 限制长度
          if (businessActivity.length > 8) {
            businessActivity = businessActivity.substring(0, 8);
          }

          resolve({ businessActivity });
        } catch (error) {
          console.error("处理AI响应失败:", error);
          reject(error);
        }
      },
      onerror: function (error) {
        console.error("AI API请求失败:", error);
        reject(new Error("无法连接到AI服务"));
      },
    });
  });
}

/**
 * 通过浙江自动编码系统API获取行业代码
 * @param {string} businessActivity - 主要业务活动描述
 * @returns {Promise<Object>} - {code: string, name: string, category: string}
 */
function getIndustryCodeFromAPI(businessActivity) {
  return new Promise((resolve, reject) => {
    // 构建API URL，使用业务活动作为关键词
    const searchTerm = encodeURIComponent(businessActivity);
    const apiUrl = `https://jcfx.tjj.zj.gov.cn:6443/autocode-clusterapi-pub/api/stats/query/mobile/des/${searchTerm}/5`;

    // 使用GM_xmlhttpRequest实现跨域请求
    GM_xmlhttpRequest({
      method: "GET",
      url: apiUrl,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      onload: function (response) {
        try {
          if (response.status !== 200) {
            reject(new Error(`行业代码API请求失败: ${response.status}`));
            return;
          }

          const data = JSON.parse(response.responseText);

          // 检查API响应格式
          if (
            !data ||
            data.code !== "00000" ||
            !data.data ||
            !data.data.Codes ||
            !data.data.Codes.length
          ) {
            reject(new Error("未找到匹配的行业代码"));
            return;
          }

          // 获取权重最高的结果
          const bestMatch = data.data.Codes[0];

          resolve({
            code: bestMatch.Code,
            name: bestMatch.Name,
            category: bestMatch.Category,
          });
        } catch (error) {
          console.error("处理行业代码API响应失败:", error);
          reject(error);
        }
      },
      onerror: function (error) {
        console.error("行业代码API请求失败:", error);
        reject(new Error("无法连接到行业代码服务"));
      },
    });
  });
}

/**
 * 格式化输出结果，方便展示或填入表单
 * @param {Object} result - analyzeCompany的返回结果
 * @returns {string} - 格式化的字符串
 */
function formatResult(result) {
  return `企业名称: ${result.companyName}
    主要业务活动: ${result.businessActivity}
    行业代码: ${result.industryCode}
    行业名称: ${result.industryName}
    行业大类: ${result.industryCategory}`;
}

// 导出函数
const CompanyAnalyzer = {
  analyzeCompany,
  getBusinessActivityFromAI,
  getIndustryCodeFromAPI,
  formatResult,
};
// 在您的油猴脚本中导入此函数库
// @require      file:///d:/OneDrive/code/mlk/getYWHDAndHYDM.js

// 然后使用函数如下：
async function handleCompany() {
  const companyName = "XX科技有限公司";

  try {
    const result = await analyzeCompany(companyName);
    console.log(`分析结果: ${formatResult(result)}`);

    // 使用结果填充表单
    document.querySelector("#zyywhd1 input").value = result.businessActivity;
    document.querySelector("#hydm input").value = result.industryCode;
  } catch (error) {
    console.error("分析失败:", error);
  }
}
