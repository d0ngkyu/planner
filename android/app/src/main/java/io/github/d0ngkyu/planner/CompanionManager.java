package io.github.d0ngkyu.planner;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.ArrayList;
import java.util.List;

public final class CompanionManager {
    static final String[] STATES={"happy","proud","crown","sleep","waiting","welcome"};
    static final int JOB_ID=8101;
    static SharedPreferences prefs(Context c) {return c.getSharedPreferences("planner_companion",Context.MODE_PRIVATE);}
    static String date() {return new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(new Date());}
    static String state(Context c) {
        SharedPreferences p=prefs(c);
        return CompanionState.resolve(System.currentTimeMillis(),p.getLong("lastVisit",0),p.getLong("welcomeUntil",0),p.getInt("total",0),p.getInt("done",0),date().equals(p.getString("date","")));
    }
    static void visit(Context c) {
        SharedPreferences p=prefs(c);long now=System.currentTimeMillis(),previous=p.getLong("lastVisit",0);
        SharedPreferences.Editor e=p.edit().putLong("lastVisit",now);
        if(previous>0 && now-previous>=2*86400000L) e.putLong("welcomeUntil",now+4*3600000L);
        e.apply();schedule(c);
    }
    static void schedule(Context c) {
        JobScheduler jobs=(JobScheduler)c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if(!prefs(c).getBoolean("enabled",true)) {jobs.cancel(JOB_ID);return;}
        if(jobs.getPendingJob(JOB_ID)==null) jobs.schedule(new JobInfo.Builder(JOB_ID,new ComponentName(c,CompanionJobService.class)).setPeriodic(6*3600000L).setPersisted(true).build());
    }
    static synchronized void applyIcon(Context c) {
        String selected=prefs(c).getBoolean("enabled",true)?state(c):"happy";
        PackageManager pm=c.getPackageManager();
        // On API33+, update all aliases atomically. On older devices enable destination first.
        if(Build.VERSION.SDK_INT>=33) {
            List<PackageManager.ComponentEnabledSetting> changes=new ArrayList<>();
            for(String s:STATES) {
                int setting=s.equals(selected)?PackageManager.COMPONENT_ENABLED_STATE_ENABLED:PackageManager.COMPONENT_ENABLED_STATE_DISABLED;
                if(pm.getComponentEnabledSetting(alias(c,s))!=setting) changes.add(new PackageManager.ComponentEnabledSetting(alias(c,s),setting,PackageManager.DONT_KILL_APP));
            }
            if(!changes.isEmpty()) pm.setComponentEnabledSettings(changes);
        } else {
            if(pm.getComponentEnabledSetting(alias(c,selected))!=PackageManager.COMPONENT_ENABLED_STATE_ENABLED) pm.setComponentEnabledSetting(alias(c,selected),PackageManager.COMPONENT_ENABLED_STATE_ENABLED,PackageManager.DONT_KILL_APP);
            for(String s:STATES) if(!s.equals(selected) && pm.getComponentEnabledSetting(alias(c,s))!=PackageManager.COMPONENT_ENABLED_STATE_DISABLED) pm.setComponentEnabledSetting(alias(c,s),PackageManager.COMPONENT_ENABLED_STATE_DISABLED,PackageManager.DONT_KILL_APP);
        }
        prefs(c).edit().putString("iconState",selected).apply();
    }
    static ComponentName alias(Context c,String state) {return new ComponentName(c,c.getPackageName()+".Icon_"+state);}
    static int image(String state) {
        switch(state) {
            case "proud":return R.drawable.companion_proud;case "crown":return R.drawable.companion_crown;
            case "sleep":return R.drawable.companion_sleep;case "waiting":return R.drawable.companion_waiting;
            case "welcome":return R.drawable.companion_welcome;default:return R.drawable.companion_happy;
        }
    }
    static String label(String state) {
        switch(state) {
            case "proud":return "하나 해냈네요!";case "crown":return "오늘 계획을 마쳤어요";
            case "sleep":return "잠깐 쉬고 있어요";case "waiting":return "언제든 돌아와도 좋아요";
            case "welcome":return "다시 만나 반가워요";default:return "오늘도 반가워요";
        }
    }
}
