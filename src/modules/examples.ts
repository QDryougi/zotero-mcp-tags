export class BasicExampleFactory {
  static registerPrefs() {}

  static registerNotifier() {}

  static exampleNotifierCallback() {}
}

export class KeyExampleFactory {
  static registerShortcuts() {}

  static exampleShortcutLargerCallback() {}

  static exampleShortcutSmallerCallback() {}
}

export class UIExampleFactory {
  static registerStyleSheet() {}

  static registerRightClickMenuItem() {}

  static registerRightClickMenuPopup() {}

  static registerWindowMenuWithSeparator() {}

  static async registerExtraColumn() {}

  static async registerExtraColumnWithCustomCell() {}

  static registerItemPaneCustomInfoRow() {}

  static registerItemPaneSection() {}

  static registerReaderItemPaneSection() {}
}

export class PromptExampleFactory {
  static registerNormalCommandExample() {}

  static registerAnonymousCommandExample() {}

  static registerConditionalCommandExample() {}
}

export class HelperExampleFactory {
  static dialogExample() {}

  static clipboardExample() {}

  static filePickerExample() {}

  static progressWindowExample() {}

  static vtableExample() {}
}
