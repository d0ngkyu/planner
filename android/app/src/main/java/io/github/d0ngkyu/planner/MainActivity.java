package io.github.d0ngkyu.planner;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(PlannerWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
