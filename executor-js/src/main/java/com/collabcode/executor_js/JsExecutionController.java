package com.collabcode.executor_js;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/execute/js")
public class JsExecutionController {
    @Autowired
    private JsExecutorService service;

    @PostMapping
    public String run(@RequestBody String code) throws Exception {
        return service.execute(code);
    }
}