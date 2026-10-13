/**
 * AI Quick Copy v1.1
 * Responsibility: route the copy action to the correct site adapter.
 */

(() => {
  const AQC = window.AIQuickCopy;
  const Settings = window.AIQuickCopySettings;
  const adapters = window.AIQuickCopyAdapters || {};

  function getAdapter() {
    const host = window.location.hostname.replace(/^www\./, "");

    for (const adapter of Object.values(adapters)) {
      if (adapter.matches(host)) return adapter;
    }

    return null;
  }

  const IS_MAC = /Mac|iPhone|iPad/.test(
    navigator.userAgentData?.platform || navigator.platform
  );
  const COPY_KEY = IS_MAC ? "⌘C" : "Ctrl+C";

  const HINT_DURATION = 4500;
  const SELECT_HINT =
    "Không nhận diện được câu trả lời.\n" +
    `👉 Bôi đen đoạn cần copy rồi nhấn ${COPY_KEY}.`;

  /**
   * What to copy, in order of priority:
   * 1. the text the user highlighted;
   * 2. the response the user is reading (on screen);
   * 3. the latest response.
   */
  function findSource(adapter) {
    const selection = AQC.getSelectionElement();
    if (selection) return { element: selection, excerpt: true };

    const responses = adapter.findAll();
    const element =
      AQC.pickInView(responses) ||
      AQC.pickLatest(AQC.innermost(responses));

    return element ? { element, excerpt: false } : null;
  }

  async function copyResponse() {
    const now = Date.now();

    if (now - AQC.state.lastTriggerAt < 500) return;
    AQC.state.lastTriggerAt = now;

    const adapter = getAdapter();

    if (!adapter) {
      AQC.showToast("Trang này chưa được hỗ trợ.", "error");
      return;
    }

    const source = findSource(adapter);

    if (!source) {
      AQC.showToast(SELECT_HINT, "hint", HINT_DURATION);
      return;
    }

    const settings = await Settings.load();

    const markdown = AQC.toMarkdown(source.element, {
      headingOffset: settings.blockMode ? AQC.BLOCK_HEADING_OFFSET : 0
    });

    if (!markdown) {
      AQC.showToast(SELECT_HINT, "hint", HINT_DURATION);
      return;
    }

    if (!settings.blockMode) {
      await AQC.copyText(
        markdown,
        source.excerpt ? "⚡ Đã copy đoạn bôi đen · Markdown" : undefined
      );
      return;
    }

    const identity = {
      id: adapter.id,
      name: adapter.name,
      icon: adapter.icon,
      role: settings.roles[adapter.id] || "",
      host: window.location.hostname.replace(/^www\./, "")
    };

    const copied = source.excerpt ? "Đã copy đoạn bôi đen" : "Đã copy";

    await AQC.copyText(
      AQC.toBlock(markdown, { ...identity, excerpt: source.excerpt }),
      `⚡ ${copied} · ${AQC.blockTitle(identity)}`
    );
  }

  function isEditable(element) {
    return (
      element instanceof HTMLElement &&
      (
        element.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)
      )
    );
  }

  function hasSelection() {
    const selection = window.getSelection();
    return Boolean(selection && !selection.isCollapsed && selection.toString().trim());
  }

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.repeat) return;

      // Ctrl+C on Windows/Linux, ⌘C on macOS.
      const isCopy =
        (IS_MAC ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "c";

      if (!isCopy) return;

      // Never hijack copy while the user is typing.
      if (isEditable(event.target) || isEditable(document.activeElement)) return;

      // Text is highlighted: let the browser copy it as usual.
      if (hasSelection()) return;

      // Nothing highlighted: the browser would copy nothing, so copy the
      // response on screen instead.
      event.preventDefault();
      event.stopPropagation();

      copyResponse();
    },
    true
  );
})();
