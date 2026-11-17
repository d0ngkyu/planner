package io.github.d0ngkyu.planner;
public final class CompanionState {
    public static String resolve(long now,long lastVisit,long welcomeUntil,int total,int done,boolean sameDay) {
        long away=lastVisit>0 ? Math.max(0,now-lastVisit) : 0;
        if(away>=5*86400000L) return "waiting";
        if(away>=2*86400000L) return "sleep";
        if(sameDay && total>0 && done>=total) return "crown";
        if(sameDay && done>0) return "proud";
        if(welcomeUntil>now) return "welcome";
        return "happy";
    }
}
