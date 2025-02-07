"use client";
import React, { useEffect, useState, useRef, Suspense } from "react";
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Modal,
  Flex,
  message,
  Skeleton,
  Row,
  Col,
} from "antd";
import currencies from "../utils/currencies";
import dropdown from "../utils/dropdown";
import useQueryId from "@/lib/useQueryId";

const currencyOptions = currencies.map((currency) => ({
  label: currency.code,
  value: currency.code,
  key: currency.code,
}));

const PageContent = () => {
  const [form] = Form.useForm();

  const [options, setOptions] = useState({
    Service_Locations: [],
    Customers: [],
    Loaders: [],
    Origins: [],
    Destinations: [],
    Select_Book: [],
  });
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [rateModalOpen, setRateModalOpen] = useState(false);

  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [convertedCurrency, setConvertedCurrency] = useState("ZMW");
  const [conversionRate, setConversionRate] = useState(0);
  const [vendorBill, setVendorBill] = useState(0);
  const [ratePerMt, setRatePerMt] = useState(0);
  const [currencyModify, setCurrencyModify] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const vendorInputRef = useRef(null);
  const rateInputRef = useRef(null);
  const [messageAPI, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const id = useQueryId();

  // Handle currency conversion
  const fetchCurrency = async (base, currnc) => {
    try {
      const query = new URLSearchParams({ currency: base });
      const response = await fetch(`/api/currency-exchange?${query}`, {
        method: "GET",
      });
      const result = await response.json();
      return result.data.conversion_rates[currnc];
    } catch (error) {
      console.log(error);
    }
  };

  const handleBaseCurrencyChange = async (baseCurr) => {
    setBaseCurrency(baseCurr);
    const conversion_rate = await fetchCurrency(baseCurr, convertedCurrency);
    setConversionRate(conversion_rate);
    setCurrencyModify(conversion_rate);
    form.setFieldsValue({
      Vendor_Bill_Converted:
        parseFloat(conversion_rate) * parseFloat(vendorBill),
      Rate_Per_MT_Converted:
        parseFloat(conversion_rate) * parseFloat(ratePerMt),
    });
  };
  const handleCurrencyChange = async (currnc) => {
    setConvertedCurrency(currnc);
    const conversion_rate = await fetchCurrency(baseCurrency, currnc);
    setConversionRate(conversion_rate);
    setCurrencyModify(conversion_rate);
    form.setFieldsValue({
      Vendor_Bill_Converted:
        parseFloat(conversion_rate) * parseFloat(vendorBill),
      Rate_Per_MT_Converted:
        parseFloat(conversion_rate) * parseFloat(ratePerMt),
    });
  };

  const handleConversionRate = () => {
    setConversionRate(currencyModify);
    const vendor_bill = vendorBill * currencyModify;
    const rate_per_mt = ratePerMt * currencyModify;
    form.setFieldsValue({
      Vendor_Bill_Converted: vendor_bill.toFixed(2),
      Rate_Per_MT_Converted: rate_per_mt.toFixed(2),
    });
  };

  const handleVendorBillChange = (bill) => {
    setVendorBill(bill);
    const convertedValue = bill * conversionRate;
    form.setFieldsValue({
      Vendor_Bill_Converted: parseFloat(convertedValue.toFixed(2)),
    });
  };

  const handleRatePerMtChange = (bill) => {
    setRatePerMt(bill);
    const convertedValue = bill * conversionRate;
    form.setFieldsValue({
      Rate_Per_MT_Converted: parseFloat(convertedValue.toFixed(2)),
    });
  };

  // Handle data fetching
  const handleFetch = async (reportName, criteria) => {
    const effectiveCriteria = criteria ? criteria : "(ID != 0)";
    const queryParams = new URLSearchParams({
      reportName,
      criteria: effectiveCriteria,
    });
    try {
      const response = await fetch(`/api/zoho?${queryParams}`, {
        method: "GET",
      });
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const result = await response.json();
      return result;
    } catch (error) {
      console.log(error);
    }
  };

  const fetchUpdateRecord = async () => {
    const response = await handleFetch("All_Shipments", `(ID == ${id})`);
    const records = response.records;
    if (records.code === 3000) {
      setEditMode(true);
      const formData = records.data[0];
      console.log(formData);

      form.setFieldsValue({
        Service_Locations: formData.Service_Locations.ID,
        Rate_Confirmation: formData.Rate_Confirmation.url,
        Trucks: formData.Trucks,
        Commodity: formData.Commodity,
        Customer: formData.Customer.ID,
        Completion: formData?.Completion.format("DD-MMM-YYYY") || null,
        Capacity: formData.Capacity,
        Origin: formData.Origin.ID,
        Base_Currency: formData.Base_Currency || baseCurrency,
        Converted_Currency: formData.Converted_Currency || convertedCurrency,
        Vendor_Bill: formData.Vendor_Bill,
        Vendor_Bill_Converted: formData.Vendor_Bill_Converted
          ? parseFloat(formData.Vendor_Bill_Converted.replace(/[^0-9.-]+/g, ""))
          : 0,
        Rate_Per_MT: formData.Rate_Per_MT,
        Rate_Per_MT_Converted: formData.Rate_Per_MT_Converted
          ? parseFloat(formData.Rate_Per_MT_Converted.replace(/[^0-9.-]+/g, ""))
          : 0,
        Commencement: formData?.Commencement.format("DD-MMM-YYYY") || null,
        Select_Book: formData.Select_Book.ID,
        Maximum_Load:
          formData.Maximum_Load?.map((data) => ({
            label: data,
            value: data,
          })) || [],
        Loader:
          formData.Loader?.map((data) => ({
            label: data.zc_display_value,
            value: data.ID,
          })) || [],
        Destinations: formData.Destinations.ID,
        Maximum_Fuel:
          formData.Maximum_Fuel?.map((data) => ({
            label: data,
            value: data,
          })) || [],
        Miximum_Disputch:
          formData.Miximum_Disputch?.map((data) => ({
            label: data,
            value: data,
          })) || [],
      });
    }
  };
  useEffect(() => {
    if (id) {
      fetchUpdateRecord();
    }
  }, [id]);

  useEffect(() => {
    const init = async () => {
      const currencyResponse = await fetchCurrency(
        baseCurrency,
        convertedCurrency
      );
      setConversionRate(currencyResponse);
      setCurrencyModify(currencyResponse);

      const serviceLocationRecords = await handleFetch(
        "Service_Locations",
        "(ID != 0)"
      );
      const customeRecords = await handleFetch("All_Customers", "(ID != 0)");
      const loaderRecords = await handleFetch(
        "All_Vendor_Statuses",
        "(ID != 0)"
      );
      const originRecords = await handleFetch("All_Sites", "(ID != 0)");
      const bookRecords = await handleFetch("All_Books", "(ID != 0)");

      setOptions((prev) => ({
        ...prev,
        Service_Locations: serviceLocationRecords.records.data.map((data) => ({
          label: data.Tracking_Route,
          value: data.ID,
        })),
        Customers: customeRecords.records.data.map((data) => ({
          label: data.Customer_Name,
          value: data.ID,
        })),
        Loaders: loaderRecords.records.data.map((data) => ({
          label: data.Vendor_Status,
          value: data.ID,
        })),
        Origins: originRecords.records.data.map((data) => ({
          label: data.Loading_Site,
          value: data.ID,
        })),
        Select_Book: bookRecords.records.data.map((data) => ({
          label: data.Organization_Name,
          value: data.ID,
        })),
      }));
      setPageLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (vendorModalOpen && vendorInputRef.current) {
      setTimeout(() => {
        vendorInputRef.current.select(); // Select the text inside the input
      }, 100); // Small delay to ensure modal animation is complete
    } else if (rateModalOpen && rateInputRef.current) {
      setTimeout(() => {
        rateInputRef.current.select(); // Select the text inside the input
      }, 100); // Small delay to ensure modal animation is complete
    }
  }, [rateModalOpen, vendorModalOpen]);

  useEffect(() => {
    form.setFieldsValue({
      Base_Currency: baseCurrency,
      Converted_Currency: convertedCurrency,
    });
  }, []);

  const handleReset = () => {
    form.resetFields();
    form.setFieldsValue({
      Base_Currency: baseCurrency,
      Converted_Currency: convertedCurrency,
    });
  };

  const dummyOptions = [
    { label: "Choice 1", value: "Choice 1" },
    { label: "Choice 2", value: "Choice 2" },
    { label: "Choice 3", value: "Choice 3" },
  ];

  const baseCurrenciesSelect = (
    <Form.Item name="Base_Currency" noStyle>
      <Select
        showSearch
        options={currencyOptions.map(({ key, ...rest }) => ({
          ...rest,
          key,
        }))}
        onChange={handleBaseCurrencyChange}
      />
    </Form.Item>
  );

  const convertedCurrenciesSelect = (
    <Form.Item name="Converted_Currency" noStyle>
      <Select
        showSearch
        options={currencyOptions.map(({ key, ...rest }) => ({
          ...rest,
          key,
        }))}
        onChange={handleCurrencyChange}
      />
    </Form.Item>
  );

  const onSubmit = async (data) => {
    setLoading(true);
    messageAPI.loading("Adding Record...!");
    const formData = {
      ...data,
      Rate_Confirmation: {
        value: data.Rate_Confirmation,
        title: data.Rate_Confirmation,
        url: data.Rate_Confirmation,
      },
      Vendor_Bill: vendorBill || "",
      Vendor_Bill_Converted:
        currencies.find((i) => i.code === convertedCurrency).symbol +
        " " +
        data.Vendor_Bill_Converted,
      Rate_Per_MT: ratePerMt || "",
      Rate_Per_MT_Converted:
        currencies.find((i) => i.code === convertedCurrency).symbol +
        " " +
        data.Rate_Per_MT_Converted,
      Completion: data.Completion?.format("DD-MMM-YYYY") || "",
      Commencement: data.Commencement?.format("DD-MMM-YYYY") || "",
      Approval_Status: "Pending",
    };
    console.log(formData);
    try {
      const response = await fetch(`/api/zoho`, {
        method: editMode ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: editMode
          ? JSON.stringify({ formData, id })
          : JSON.stringify({ formName: "Load_Board", formData }),
      });
      const result = await response.json();
      console.log(result);
      messageAPI.destroy();
      messageAPI.success("Record Successfully Added!");
    } catch (error) {
      console.error(error);
      messageAPI.destroy();
      messageAPI.error("Failed to add record");
    } finally {
      setLoading(false);
      form.resetFields();
      form.setFieldsValue({
        Base_Currency: baseCurrency,
        Converted_Currency: convertedCurrency,
      });
    }
  };

  return (
    <div className="p-2">
      <div style={{ display: pageLoading ? "block" : "none" }}>
        <Skeleton.Input active style={{ width: 300, marginBottom: 20 }} />
        <Skeleton
          active
          paragraph={{ rows: 10 }}
          style={{ marginBottom: 20 }}
        />
        <Row gutter={16}>
          <Col span={12}>
            <Skeleton.Button active block />
          </Col>
          <Col span={12}>
            <Skeleton.Button active block />
          </Col>
        </Row>
      </div>

      <Form
        form={form}
        onFinish={onSubmit}
        layout="vertical"
        initialValues={{ Trucks: 0, Capacity: 0 }}
        style={{ display: pageLoading ? "none" : "block" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-15 gap-y-4">
          <Form.Item
            name="Service_Locations"
            label="Service Locations"
            rules={[{ required: true, message: "Required" }]}
            className="w-[300px]"
          >
            <Select
              placeholder="Choose"
              className="w-[300px]"
              options={options.Service_Locations}
              showSearch
              allowClear
            />
          </Form.Item>
          <Form.Item
            name="Rate_Confirmation"
            label="Rate Confirmation"
            rules={[{ required: true, message: "Required" }]}
            className="w-[300px]"
          >
            <Input />
          </Form.Item>
          <Form.Item name="Trucks" label="Trucks" className="w-[300px]">
            <InputNumber min={0} className="!w-[300px]" />
          </Form.Item>
          <Form.Item
            name="Customer"
            label="Customer"
            rules={[{ required: true, message: "Required" }]}
            className="w-[300px]"
          >
            <Select
              placeholder="Choose"
              className="w-[300px]"
              options={options.Customers}
              showSearch
              allowClear
            />
          </Form.Item>
          <Form.Item name="Completion" label="Completion" className="w-[300px]">
            <DatePicker format="DD-MMM-YYYY" className="w-[300px]" />
          </Form.Item>
          <Form.Item
            name="Maximum_Load"
            label="Maximum Load"
            rules={[{ required: true, message: "Required" }]}
            className="w-[300px]"
          >
            <Select
              placeholder="Choose"
              className="w-[300px]"
              options={dropdown.maximum_load}
              mode="multiple"
              allowClear
            />
          </Form.Item>
          <Form.Item
            name="Commodity"
            label="Commodity"
            rules={[{ required: true, message: "Required" }]}
            className="w-[300px]"
          >
            <Select
              placeholder="Choose"
              className="w-[300px]"
              options={dropdown.commodity}
              allowClear
            />
          </Form.Item>
          <Form.Item
            name="Loader"
            label="Loader"
            rules={[{ required: true, message: "Required" }]}
            className="w-[300px]"
          >
            <Select
              placeholder="Choose"
              className="w-[300px]"
              options={options.Loaders}
              mode="multiple"
              allowClear
            />
          </Form.Item>
          <Form.Item name="Capacity" label="Capacity" className="w-[300px]">
            <InputNumber min={0} className="!w-[300px]" />
          </Form.Item>
          <Form.Item
            name="Origin"
            label="Origin"
            rules={[{ required: true, message: "Required" }]}
            className="w-[300px]"
          >
            <Select
              placeholder="Choose"
              className="w-[300px]"
              options={options.Origins}
              allowClear
            />
          </Form.Item>
          <Flex vertical>
            <Form.Item
              label="Vendor Bill"
              name="Vendor_Bill"
              className="w-[300px] !mb-1"
            >
              <InputNumber
                addonBefore={baseCurrenciesSelect}
                min={0}
                className="w-[300px]"
                onChange={handleVendorBillChange}
              />
            </Form.Item>
            {baseCurrency !== convertedCurrency && (
              <div className="p-1 text-xs flex items-center text-blue-500 justify-start gap-[10px]">
                <div>{`1 ${baseCurrency} = ${conversionRate} ${convertedCurrency}`}</div>
                <small
                  className="cursor-pointer"
                  onClick={() => setVendorModalOpen(true)}
                >
                  Edit
                </small>
                <Modal
                  title="Modify Currency"
                  open={vendorModalOpen}
                  onClose={() => setVendorModalOpen((curr) => !curr)}
                  onCancel={() => setVendorModalOpen((curr) => !curr)}
                  footer={
                    <Button
                      type="submit"
                      onClick={() => {
                        handleConversionRate();
                        setVendorModalOpen(false);
                      }}
                    >
                      Save
                    </Button>
                  }
                >
                  <Input
                    autoFocus
                    ref={vendorInputRef}
                    className="mt-2"
                    defaultValue={currencyModify}
                    onChange={(e) => setCurrencyModify(e.target.value)}
                  />
                </Modal>
              </div>
            )}
          </Flex>
          <Form.Item
            label="Vendor Bill Converted"
            name="Vendor_Bill_Converted"
            className="w-[300px]"
          >
            <InputNumber
              addonBefore={convertedCurrenciesSelect}
              min={0}
              className="w-[300px]"
              disabled
            />
          </Form.Item>
          <Form.Item
            name="Maximum_Fuel"
            label="Maximum Fuel"
            className="w-[300px]"
          >
            <Select
              placeholder="Choose"
              className="w-[300px]"
              options={dummyOptions}
              mode="multiple"
              allowClear
            />
          </Form.Item>
          <Form.Item
            name="Destinations"
            label="Destinations"
            rules={[{ required: true, message: "Required" }]}
            className="w-[300px]"
          >
            <Select
              placeholder="Choose"
              className="w-[300px]"
              options={options.Origins}
              allowClear
            />
          </Form.Item>
          <Form.Item
            name="Select_Book"
            label="Select Book"
            rules={[{ required: true, message: "Required" }]}
            className="w-[300px]"
          >
            <Select
              placeholder="Choose"
              className="w-[300px]"
              options={options.Select_Book}
              allowClear
            />
          </Form.Item>
          <Form.Item
            name="Miximum_Disputch"
            label="Maximum Dispatch"
            className="w-[300px]"
          >
            <Select
              placeholder="Choose"
              className="w-[300px]"
              options={dummyOptions}
              mode="multiple"
              allowClear
            />
          </Form.Item>
          <Flex vertical>
            <Form.Item
              label="Rate Per MT"
              name="Rate_Per_MT"
              rules={[{ required: true, message: "Required" }]}
              className="w-[300px] !mb-1"
            >
              <InputNumber
                addonBefore={baseCurrenciesSelect}
                min={0}
                className="w-[300px]"
                onChange={handleRatePerMtChange}
              />
            </Form.Item>
            {baseCurrency !== convertedCurrency && (
              <div className="p-1 text-xs flex items-center text-blue-500 justify-start gap-[10px]">
                <div>{`1 ${baseCurrency} = ${conversionRate} ${convertedCurrency}`}</div>
                <small
                  className="cursor-pointer"
                  onClick={() => setRateModalOpen(true)}
                >
                  Edit
                </small>
                <Modal
                  title="Modify Currency"
                  open={rateModalOpen}
                  onClose={() => setRateModalOpen((curr) => !curr)}
                  onCancel={() => setRateModalOpen((curr) => !curr)}
                  footer={
                    <Button
                      type="submit"
                      onClick={() => {
                        handleConversionRate();
                        setRateModalOpen(false);
                      }}
                    >
                      Save
                    </Button>
                  }
                >
                  <Input
                    autoFocus
                    ref={rateInputRef}
                    className="mt-2"
                    defaultValue={currencyModify}
                    onChange={(e) => setCurrencyModify(e.target.value)}
                  />
                </Modal>
              </div>
            )}
          </Flex>
          <Form.Item
            label="Rate Per MT Converted"
            name="Rate_Per_MT_Converted"
            rules={[{ required: true, message: "Required" }]}
            className="w-[300px]"
          >
            <InputNumber
              addonBefore={convertedCurrenciesSelect}
              min={0}
              className="w-[300px]"
              disabled
            />
          </Form.Item>
          <Form.Item
            name="Commencement"
            label="Commencement"
            className="w-[300px]"
          >
            <DatePicker format="DD-MMM-YYYY" className="w-[300px]" />
          </Form.Item>
        </div>
        {contextHolder}
        <Flex justify="center" gap="large">
          <Form.Item label={null}>
            <Button className="w-28" htmlType="button" onClick={handleReset}>
              Reset
            </Button>
          </Form.Item>
          <Form.Item label={null}>
            <Button
              type="primary"
              htmlType="submit"
              className="w-28"
              loading={loading}
            >
              Submit
            </Button>
          </Form.Item>
        </Flex>
      </Form>
    </div>
  );
};

const page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageContent />
    </Suspense>
  );
};

export default page;
