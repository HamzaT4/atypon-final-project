package com.collabcode.executor_python;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/execute/python")
public class PythonExecutionController {
    @Autowired
    private PythonExecutorService service;

    @PostMapping
    public String run(@RequestBody String code) throws Exception {
        return service.execute(code);
    }
}