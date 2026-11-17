package io.github.d0ngkyu.planner;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PlannerWidget")
public class PlannerWidgetPlugin extends Plugin {
    @PluginMethod public void update(PluginCall call) {
        String data = call.getString("data", "{}");
        getContext().getSharedPreferences("planner_widget", 0).edit()
            .putString("data", data).putLong("updated", System.currentTimeMillis()).apply();
        PlannerWidgetProvider.refresh(getContext());
        call.resolve();
    }
}
