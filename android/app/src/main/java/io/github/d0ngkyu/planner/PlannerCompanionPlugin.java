package io.github.d0ngkyu.planner;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.content.SharedPreferences;
@CapacitorPlugin(name="PlannerCompanion")
public class PlannerCompanionPlugin extends Plugin {
    @PluginMethod public void update(PluginCall call) {
        try {
            if(Boolean.TRUE.equals(call.getBoolean("visit",false))) CompanionManager.visit(getContext());
            SharedPreferences p=CompanionManager.prefs(getContext());SharedPreferences.Editor e=p.edit();
            if(call.hasOption("enabled")) e.putBoolean("enabled",Boolean.TRUE.equals(call.getBoolean("enabled")));
            if(call.hasOption("date")) e.putString("date",call.getString("date", "")).putInt("total",Math.max(0,call.getInt("total",0))).putInt("done",Math.max(0,call.getInt("done",0)));
            e.apply();CompanionManager.schedule(getContext());CompanionManager.applyIcon(getContext());PlannerWidgetProvider.refresh(getContext());
            JSObject result=new JSObject();result.put("state",CompanionManager.state(getContext()));result.put("enabled",p.getBoolean("enabled",true));call.resolve(result);
        } catch(RuntimeException ex) {call.reject("캐릭터 아이콘을 갱신하지 못했습니다",ex);}
    }
}
