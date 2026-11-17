package io.github.d0ngkyu.planner;
import org.junit.Test;
import static org.junit.Assert.assertEquals;
public class CompanionStateTest {
    final long day=86400000L, now=20*day;
    @Test public void visitAndCompletionStates() {
        assertEquals("happy",CompanionState.resolve(now,now,0,0,0,true));
        assertEquals("happy",CompanionState.resolve(now,now,0,2,0,true));
        assertEquals("proud",CompanionState.resolve(now,now,0,2,1,true));
        assertEquals("crown",CompanionState.resolve(now,now,0,2,2,true));
        assertEquals("happy",CompanionState.resolve(now,now,0,2,2,false));
    }
    @Test public void inactivityBoundariesAndReturn() {
        assertEquals("happy",CompanionState.resolve(now,now-2*day+1,0,0,0,true));
        assertEquals("sleep",CompanionState.resolve(now,now-2*day,0,0,0,true));
        assertEquals("waiting",CompanionState.resolve(now,now-5*day,0,0,0,true));
        assertEquals("welcome",CompanionState.resolve(now,now,now+1000,0,0,true));
        assertEquals("happy",CompanionState.resolve(now,now,now,0,0,true));
        assertEquals("happy",CompanionState.resolve(now,now+day,0,0,0,true));
    }
}
