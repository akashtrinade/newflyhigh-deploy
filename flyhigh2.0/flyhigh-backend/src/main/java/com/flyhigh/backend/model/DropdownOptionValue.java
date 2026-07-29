package com.flyhigh.backend.model;

public class DropdownOptionValue {

    private String value;
    private String label;
    private String parentValue;
    private Integer sortOrder = 0;
    private Boolean active = true;
    private Boolean custom = false;

    public DropdownOptionValue() {}

    public DropdownOptionValue(String value, String label, Integer sortOrder) {
        this.value = value;
        this.label = label;
        this.sortOrder = sortOrder;
    }

    public DropdownOptionValue(String value, String label, String parentValue, Integer sortOrder) {
        this.value = value;
        this.label = label;
        this.parentValue = parentValue;
        this.sortOrder = sortOrder;
    }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getParentValue() { return parentValue; }
    public void setParentValue(String parentValue) { this.parentValue = parentValue; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public Boolean getCustom() { return custom; }
    public void setCustom(Boolean custom) { this.custom = custom; }
}
