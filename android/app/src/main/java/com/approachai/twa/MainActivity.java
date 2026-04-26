package com.approachai.twa;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LegacyGoogleAuth.class);
        super.onCreate(savedInstanceState);
        // Disable Android WebView overscroll. CSS overscroll-behavior:none doesn't
        // reach the native rubber-band effect that shifts fixed elements during
        // scroll, so disable it at the view level.
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
        }
        applyLightSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // Some OEMs reset the appearance flags after IME or theme transitions.
        // Re-apply on every focus regain so the dark icons survive.
        if (hasFocus) applyLightSystemBars();
    }

    private void applyLightSystemBars() {
        // Force dark (gray) system nav + status bar icons regardless of the
        // device dark-mode setting. The app bg is always light, so we always
        // want dark icons.
        //
        // setAppearanceLightNavigationBars on its own is unreliable when the
        // system applies an automatic contrast scrim (Android 10+ adds a
        // translucent dark overlay behind a transparent nav bar, which makes
        // the OS think the bar is "dark" and ignore the appearance flag).
        // setNavigationBarContrastEnforced(false) disables that scrim so the
        // appearance flag actually takes effect.
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setAppearanceLightNavigationBars(true);
            controller.setAppearanceLightStatusBars(true);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setNavigationBarContrastEnforced(false);
            getWindow().setStatusBarContrastEnforced(false);
        }
    }

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}
}
