// Replace em and en dashes in text nodes with a simple hyphen, safely.

/**
 * Returns true if the node (or any ancestor) is editable or should be skipped.
 */
function shouldSkipNode(node) {
  for (let current = node; current; current = current.parentNode) {
    if (current.nodeType !== Node.ELEMENT_NODE) continue;
    const element = /** @type {Element} */ (current);
    const tagName = element.tagName;
    if (
      tagName === "SCRIPT" ||
      tagName === "STYLE" ||
      tagName === "TEXTAREA" ||
      tagName === "INPUT" ||
      tagName === "CODE" ||
      tagName === "PRE"
    ) {
      return true;
    }
    const isContentEditable =
      element.getAttribute && element.getAttribute("contenteditable");
    if (isContentEditable && isContentEditable.toLowerCase() !== "false") {
      return true;
    }
  }
  return false;
}

/**
 * Replace target dashes in a string.
 */
function replaceDashes(text) {
  // \u2014 = em dash —, \u2013 = en dash –
  return text.replace(/[\u2014\u2013]/g, "-");
}

/**
 * Processes a node's descendant text nodes and applies replacement.
 */
function processNode(root) {
  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        if (shouldSkipNode(node.parentNode)) return NodeFilter.FILTER_REJECT;
        // Quick check to avoid needless replacements
        return /[\u2014\u2013]/.test(node.nodeValue)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });

    const updates = [];
    let textNode;
    while ((textNode = walker.nextNode())) {
      updates.push(textNode);
    }
    for (const node of updates) {
      node.nodeValue = replaceDashes(node.nodeValue || "");
    }
  } catch (e) {
    // No-op: be resilient on sites that mutate DOM mid-iteration
  }
}

// Initial pass on DOMContentLoaded/idle
processNode(document.documentElement || document.body);

// Observe dynamic changes (common on ChatGPT/Gemini/Claude)
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === "characterData") {
      const node = mutation.target;
      if (
        node &&
        node.nodeType === Node.TEXT_NODE &&
        node.nodeValue &&
        !shouldSkipNode(node.parentNode)
      ) {
        if (/[\u2014\u2013]/.test(node.nodeValue)) {
          node.nodeValue = replaceDashes(node.nodeValue);
        }
      }
    }
    if (mutation.type === "childList") {
      for (const added of mutation.addedNodes) {
        if (added.nodeType === Node.TEXT_NODE) {
          const node = /** @type {Text} */ (added);
          if (
            node.nodeValue &&
            /[\u2014\u2013]/.test(node.nodeValue) &&
            !shouldSkipNode(node.parentNode)
          ) {
            node.nodeValue = replaceDashes(node.nodeValue);
          }
        } else if (added.nodeType === Node.ELEMENT_NODE) {
          processNode(added);
        }
      }
    }
  }
});

observer.observe(document.documentElement || document.body, {
  characterData: true,
  characterDataOldValue: false,
  childList: true,
  subtree: true,
});
