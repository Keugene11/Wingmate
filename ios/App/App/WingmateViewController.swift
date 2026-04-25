import UIKit
import WebKit
import Capacitor

/**
 Custom CAPBridgeViewController that prevents WKWebView JavaScript dialog crashes.

 Capacitor 8.2.0's WebViewDelegationHandler has bugs in its WKUIDelegate methods:
 - runJavaScriptConfirmPanel does not call the completion handler when
   bridge?.viewController is nil, causing WKWebView to crash (EXC_BAD_ACCESS).
 - runJavaScriptAlertPanel can fail to present if another modal is active,
   leaving the completion handler uncalled and the web view deadlocked.

 Since the WKUIDelegate lives on WebViewDelegationHandler (not this VC), we fix
 this by injecting JavaScript that replaces window.alert/confirm with safe no-ops,
 preventing the buggy native dialog path from ever being triggered.

 The script is injected in capacitorDidLoad() — after the web view is created but
 BEFORE loadWebView() loads the remote URL — ensuring it's present for the very
 first page load.
*/
class WingmateViewController: CAPBridgeViewController {

    // App bg color (#f5f5f7) — kept in sync with --color-bg in globals.css.
    // We paint it on the view + WebView + scrollView so any pixel the
    // WebView doesn't draw (home-indicator strip on iPad in particular)
    // shows the app bg instead of system white.
    private static let appBg = UIColor(
        red: 245.0/255.0, green: 245.0/255.0, blue: 247.0/255.0, alpha: 1.0
    )

    // capacitorDidLoad is called in loadView() after the webView and bridge are
    // fully set up, but BEFORE viewDidLoad() calls loadWebView(). This is the
    // only correct injection point — viewDidLoad is too late.
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()

        // self.webView is the correct accessor (public property on
        // CAPBridgeViewController). Do NOT use bridge?.webView which goes
        // through the protocol and may resolve differently.
        self.webView?.configuration.userContentController.addUserScript(
            WKUserScript(
                source: Self.safetyScript,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: false
            )
        )
    }

    override open func viewDidLoad() {
        super.viewDidLoad()

        // Override Capacitor's default white. Setting bg only on
        // SceneDelegate's window/vc.view doesn't stick — Capacitor resets
        // some of these in its own viewDidLoad. Setting here, after super,
        // wins.
        self.view.backgroundColor = Self.appBg

        // Make the WebView itself transparent so the view bg shows through
        // anywhere the page hasn't painted (e.g. before first paint), and
        // paint the underlying scrollView bg so iPad's home-indicator
        // bounce/over-scroll area matches the app bg.
        if let wv = self.webView {
            wv.isOpaque = false
            wv.backgroundColor = Self.appBg
            wv.scrollView.backgroundColor = Self.appBg
        }
    }

    // MARK: - JavaScript safety layer

    private static let safetyScript = """
    (function() {
        // Replace window.alert with a safe no-op.
        // Capacitor 8.2.0's native alert handler can crash on iOS 26+ when the
        // completion handler is not called (e.g. failed modal presentation).
        // Our app never intentionally uses alert() — any call is from an
        // unhandled error or third-party code.
        window.alert = function(msg) {
            console.warn('[Wingmate] Suppressed alert:', msg);
        };

        // Replace window.confirm with a safe default.
        // Same crash risk as alert — the native confirm handler doesn't call its
        // completion handler when bridge.viewController is nil.
        window.confirm = function(msg) {
            console.warn('[Wingmate] Suppressed confirm:', msg);
            return true;
        };

        // Note: window.prompt is NOT replaced because Capacitor uses it
        // internally for cookie and HTTP config (CapacitorCookies, CapacitorHttp).

        // Catch unhandled errors to prevent them from triggering native dialogs
        window.addEventListener('error', function(e) {
            console.error('[Wingmate] Unhandled error:', e.message, e.filename, e.lineno);
            e.preventDefault();
            return true;
        });

        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', function(e) {
            console.error('[Wingmate] Unhandled rejection:', e.reason);
            e.preventDefault();
        });
    })();
    """;
}
