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
console.log(
  getAllElementsTextByXPath(
    '//*[@id="content"]/section[2]/common-project-bill/common-bill/div/div[1]/mat-drawer-container/mat-drawer/div/common-bill-check-list/div/div/div[2]/div[2]/div[1]/div'
  )
);
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
      console.log(fieldName);
    } catch (e) {
      console.error("获取字段名称失败:", e);
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

setValueByXpath('//*[@id="hydm"]/input', "123456");
