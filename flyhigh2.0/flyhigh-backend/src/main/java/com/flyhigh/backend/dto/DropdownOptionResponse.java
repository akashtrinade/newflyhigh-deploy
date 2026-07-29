package com.flyhigh.backend.dto;

public class DropdownOptionResponse {

    private String value;
    private String label;
    private String parentValue;
    private Boolean custom;

    public DropdownOptionResponse() {}

    public DropdownOptionResponse(String value, String label, String parentValue, Boolean custom) {
        this.value = value;
        this.label = label;
        this.parentValue = parentValue;
        this.custom = custom;
    }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getParentValue() { return parentValue; }
    public void setParentValue(String parentValue) { this.parentValue = parentValue; }

    public Boolean getCustom() { return custom; }
    public void setCustom(Boolean custom) { this.custom = custom; }
}
