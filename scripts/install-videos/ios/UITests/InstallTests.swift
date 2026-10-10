import XCTest

/// Drives Safari through Share › Add to Home Screen › Add for TikTym, pausing on each step so the screen recording
/// (scripts/install-videos/record.sh) is easy to follow. Safari must already show https://app.tiktym.com.
final class InstallTests: XCTestCase {
  func testAddToHomeScreen() throws {
    let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
    safari.activate()
    sleep(2)
    let share = safari.buttons["ShareButton"].exists ? safari.buttons["ShareButton"] : safari.buttons["Share"]
    XCTAssertTrue(share.waitForExistence(timeout: 10), safari.debugDescription)
    share.tap()
    sleep(2)
    var add = safari.buttons["Add to Home Screen"]
    if !add.waitForExistence(timeout: 3) { add = safari.cells["Add to Home Screen"] }
    if !add.waitForExistence(timeout: 3) { safari.swipeUp(); sleep(1) }
    if !add.exists { add = safari.staticTexts["Add to Home Screen"] }
    XCTAssertTrue(add.waitForExistence(timeout: 5), safari.debugDescription)
    sleep(1)
    add.tap()
    sleep(3)
    let confirm = safari.buttons["Add"]
    XCTAssertTrue(confirm.waitForExistence(timeout: 8), safari.debugDescription)
    confirm.tap()
    sleep(2)
    XCUIDevice.shared.press(.home)
    sleep(3)
  }
}
