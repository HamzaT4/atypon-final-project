package com.collabcode.executor_ruby;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/execute/ruby")
public class RubyExecutionController {
    @Autowired
    private RubyExecutorService service;

    @PostMapping
    public String run(@RequestBody String code) throws Exception {
        return service.execute(code);
    }
}