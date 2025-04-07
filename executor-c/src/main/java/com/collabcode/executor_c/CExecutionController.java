package com.collabcode.executor_c;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/execute/c")
public class CExecutionController {
    @Autowired
    private CExecutorService service;

    @PostMapping
    public String run(@RequestBody String code) throws Exception {
        return service.execute(code);
    }
}