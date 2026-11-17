package io.github.d0ngkyu.planner;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import org.json.JSONObject;
import org.json.JSONArray;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class PlannerWidgetProvider extends AppWidgetProvider {
    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) { refresh(context); }
    public static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, PlannerWidgetProvider.class));
        SharedPreferences prefs = context.getSharedPreferences("planner_widget", 0);
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        String body = "앱을 열어 오늘 할 일을 확인하세요", heading = "오늘 할 일";
        try {
            JSONObject data = new JSONObject(prefs.getString("data", "{}"));
            JSONObject day = data.optJSONObject("days").optJSONObject(today);
            if(day != null) {
                int count = day.optInt("count");
                heading += " · " + count + "개";
                JSONArray lines = day.getJSONArray("lines");
                StringBuilder text = new StringBuilder();
                for(int i=0;i<lines.length();i++) { if(i>0) text.append("\n\n"); text.append(lines.getString(i)); }
                if(count>5) text.append("\n\n외 ").append(count-5).append("개 · 앱에서 보기");
                body = count==0 ? "예정된 일이 없어요. 여유로운 하루 보내세요." : text.toString();
            }
        } catch(Exception ignored) { /* No snapshot yet: show open-app instruction. */ }
        Intent launch = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent open = PendingIntent.getActivity(context, 8100, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        for(int id:ids) {
            RemoteViews view = new RemoteViews(context.getPackageName(), R.layout.planner_widget);
            view.setTextViewText(R.id.widget_heading, heading);
            view.setTextViewText(R.id.widget_body, body);
            long updated = prefs.getLong("updated", 0);
            view.setTextViewText(R.id.widget_footer, updated == 0 ? "플래너 열기 →" : "마지막 앱 기록 " + new SimpleDateFormat("M/d HH:mm", Locale.KOREA).format(new Date(updated)) + " · 열기 →");
            view.setOnClickPendingIntent(R.id.widget_root, open);
            manager.updateAppWidget(id, view);
        }
    }
}
