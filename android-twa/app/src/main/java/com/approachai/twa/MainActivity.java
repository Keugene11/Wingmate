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
            // If TWA fails, open in default browser
            Intent intent = new Intent(Intent.ACTION_VIEW,
                    Uri.parse("https://wingmate.live"));
            startActivity(intent);
            finish();
        }
    }
}
