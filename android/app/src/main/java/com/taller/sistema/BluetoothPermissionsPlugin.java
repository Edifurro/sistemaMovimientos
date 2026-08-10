package com.taller.sistema;

import android.Manifest;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "BluetoothPermissions",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            }
        )
    }
)
public class BluetoothPermissionsPlugin extends Plugin {

    @PluginMethod
    public void requestBluetoothPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            resolvePermission(call, true);
            return;
        }

        if (getPermissionState("bluetooth") == PermissionState.GRANTED) {
            resolvePermission(call, true);
            return;
        }

        requestPermissionForAlias(
            "bluetooth",
            call,
            "bluetoothPermissionCallback"
        );
    }

    @PermissionCallback
    private void bluetoothPermissionCallback(PluginCall call) {
        resolvePermission(
            call,
            getPermissionState("bluetooth") == PermissionState.GRANTED
        );
    }

    private void resolvePermission(PluginCall call, boolean granted) {
        JSObject result = new JSObject();
        result.put("bluetooth", granted ? "granted" : "denied");
        call.resolve(result);
    }
}
