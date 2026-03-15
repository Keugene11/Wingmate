package com.approachai.twa;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

public class MainActivity extends LauncherActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        try {
            super.onCreate(savedInstanceState);
        } catch (Exception e) {
            // If TWA fails (no Chrome, etc.), open in default browser
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(getDefaultUrl()));
            startActivity(intent);
            finish();
        }
    }

    @Override
    protected Uri getLaunchingUrl() {
        Uri uri = getIntent().getData();
        if (uri != null) {
            return uri;
        }
        return Uri.parse(getDefaultUrl());
    }

    private String getDefaultUrl() {
        try {
            return getIntent().getStringExtra("android.support.customtabs.trusted.DEFAULT_URL");
        } catch (Exception e) {
            return "https://wingmate.live";
        }
    }
}
