package com.flyhigh.backend.dto;

import java.util.ArrayList;
import java.util.List;

public class DropdownFieldResponse {

    private String key;
    private String label;
    private String placeholder;
    private Boolean allowCustom;
    private Boolean multiSelect;
    private String dependsOn;
    private List<DropdownOptionResponse> options = new ArrayList<>();

    public DropdownFieldResponse() {}

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getPlaceholder() { return placeholder; }
    public void setPlaceholder(String placeholder) { this.placeholder = placeholder; }

    public Boolean getAllowCustom() { return allowCustom; }
    public void setAllowCustom(Boolean allowCustom) { this.allowCustom = allowCustom; }

    public Boolean getMultiSelect() { return multiSelect; }
    public void setMultiSelect(Boolean multiSelect) { this.multiSelect = multiSelect; }

    public String getDependsOn() { return dependsOn; }
    public void setDependsOn(String dependsOn) { this.dependsOn = dependsOn; }

    public List<DropdownOptionResponse> getOptions() { return options; }
    public void setOptions(List<DropdownOptionResponse> options) { this.options = options; }
}
