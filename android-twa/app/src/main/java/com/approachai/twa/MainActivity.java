package com.approachai.twa;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

public class MainActivity extends LauncherActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Opt out of edge-to-edge enforcement on Android 15+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        }
        try {
            super.onCreate(savedInstanceState);
        } catch (Exception e) {
            // If TWA fails, open in default browser
            Intent intent = new Intent(Intent.ACTION_VIEW,
                    Uri.parse("https://wingmate.live"));
            startActivity(intent);
            finish();
        }
    }
}
