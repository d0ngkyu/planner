package io.github.d0ngkyu.planner;
import android.app.job.JobParameters;
import android.app.job.JobService;
import android.util.Log;
public class CompanionJobService extends JobService {
    @Override public boolean onStartJob(JobParameters params) {
        new Thread(()->{
            try {CompanionManager.applyIcon(this);PlannerWidgetProvider.refresh(this);}
            catch(RuntimeException e) {Log.w("PlannerCompanion","Icon update deferred",e);}
            finally {jobFinished(params,false);}
        },"planner-companion").start();
        return true;
    }
    @Override public boolean onStopJob(JobParameters params) {return true;}
}
