import XCTest

/// Drives Safari through Share › Add to Home Screen › Add for TikTym, pausing on each step so the screen recording
/// (scripts/install-videos/record.sh) is easy to follow. Safari must already show https://app.tiktym.com.
/// Prints TIKTYM_MARK <step> <unix time> so record.sh can cut the recording to the taps.
private func mark(_ step: String) { print("TIKTYM_MARK \(step) \(Date().timeIntervalSince1970)") }

final class InstallTests: XCTestCase {
  func testAddToHomeScreen() throws {
    let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
    safari.activate()
    sleep(2)
    let share = safari.buttons["ShareButton"].exists ? safari.buttons["ShareButton"] : safari.buttons["Share"]
    XCTAssertTrue(share.waitForExistence(timeout: 10), safari.debugDescription)
    sleep(1)
    mark("share")
    share.tap()
    sleep(2)
    // Add to Home Screen is below the first screenful of the share sheet: scroll to it, as a person would
    safari.swipeUp()
    sleep(1)
    var add = safari.buttons["Add to Home Screen"]
    if !add.exists { add = safari.cells["Add to Home Screen"] }
    if !add.exists { add = safari.staticTexts["Add to Home Screen"] }
    XCTAssertTrue(add.waitForExistence(timeout: 5), safari.debugDescription)
    sleep(1)
    add.tap()
    sleep(3)
    let confirm = safari.buttons["Add"]
    XCTAssertTrue(confirm.waitForExistence(timeout: 8), safari.debugDescription)
    confirm.tap()
    mark("added") // iOS goes to the home screen straight after this
    sleep(2)
    XCUIDevice.shared.press(.home)
    sleep(2)
    // the icon may land on a later home-screen page: go to it, so the video ends on TikTym
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    for _ in 0..<4 where !springboard.icons["TikTym"].isHittable { springboard.swipeLeft(); sleep(1) }
    sleep(3)
  }
}
