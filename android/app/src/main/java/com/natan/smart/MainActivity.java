package com.natan.smart;

import android.content.Intent;
import android.os.Build;

import com.getcapacitor.BridgeActivity;
import com.natan.smart.automation.NatanAutomationPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(NatanAutomationPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();

        Intent serviceIntent = new Intent(this, NatanBackgroundService.class);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
    }
}
