import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithValibot } from "@conform-to/valibot";
import type { CreateRecipeInput } from "@misette/api-contract";
import { Link } from "@tanstack/react-router";
import {
  Button,
  Input,
  Label,
  TextArea,
  TextField,
} from "react-aria-components";
import { css } from "styled-system/css";
import * as v from "valibot";

const nullableStringSchema = v.nullish(
  v.pipe(
    v.string(),
    v.transform((value) => value.trim() || null)
  ),
  null
);
const nullableNumberSchema = v.nullish(v.number(), null);
const nullableMinutesSchema = v.nullish(
  v.pipe(v.number(), v.integer(), v.minValue(0)),
  null
);
const recipeFormSchema = v.object({
  changeNote: nullableStringSchema,
  cookingTimeMinutes: nullableMinutesSchema,
  description: nullableStringSchema,
  ingredients: v.optional(
    v.array(
      v.object({
        displayName: v.pipe(
          v.string(),
          v.trim(),
          v.minLength(1, "材料名は必須です")
        ),
        note: nullableStringSchema,
        quantityText: nullableStringSchema,
        quantityUnit: nullableStringSchema,
        quantityValue: nullableNumberSchema,
      })
    ),
    []
  ),
  servingsText: nullableStringSchema,
  source: v.object({
    sourceName: nullableStringSchema,
    sourceType: v.picklist(["original", "website", "book", "other"]),
    sourceUrl: nullableStringSchema,
  }),
  steps: v.optional(
    v.array(
      v.object({
        body: v.pipe(v.string(), v.trim(), v.minLength(1, "手順は必須です")),
      })
    ),
    []
  ),
  title: v.pipe(v.string(), v.trim(), v.minLength(1, "タイトルは必須です")),
});

export interface RecipeFormValue {
  changeNote: string | null;
  recipe: CreateRecipeInput;
}

interface RecipeFormProps {
  conflictRecipeId?: string | undefined;
  initialValue?: CreateRecipeInput & { changeNote?: string | null };
  isPending: boolean;
  mode: "create" | "revision";
  onSubmit: (value: RecipeFormValue) => void;
}

interface FormField {
  errorId: string;
  errors?: string[] | undefined;
  initialValue?: number | string | null | undefined;
  key?: string | undefined;
  name: string;
}

const defaultRecipe: CreateRecipeInput = {
  cookingTimeMinutes: null,
  description: null,
  ingredients: [],
  servingsText: null,
  source: {
    sourceName: null,
    sourceType: "original",
    sourceUrl: null,
  },
  steps: [],
  title: "",
};

const formClass = css({
  display: "grid",
  gap: "6",
  maxW: "3xl",
});
const fieldClass = css({
  display: "grid",
  gap: "1.5",
});
const inputClass = css({
  _focusVisible: {
    outline: "3px solid",
    outlineColor: "blue.600",
    outlineOffset: "2px",
  },
  borderColor: "gray.400",
  borderRadius: "md",
  borderWidth: "1px",
  minH: "12",
  px: "3",
  py: "2",
  width: "full",
});
const buttonClass = css({
  _disabled: {
    cursor: "not-allowed",
    opacity: "0.55",
  },
  _focusVisible: {
    outline: "3px solid",
    outlineColor: "blue.600",
    outlineOffset: "2px",
  },
  alignItems: "center",
  borderColor: "gray.700",
  borderRadius: "md",
  borderWidth: "1px",
  cursor: "pointer",
  display: "inline-flex",
  justifyContent: "center",
  minH: "12",
  px: "4",
  py: "2",
});
const errorClass = css({ color: "red.700", fontSize: "sm" });
const itemClass = css({
  borderColor: "gray.300",
  borderRadius: "lg",
  borderWidth: "1px",
  display: "grid",
  gap: "3",
  p: "4",
});

const asInputValue = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
};

const toFormDefaultValue = (
  value: CreateRecipeInput & { changeNote?: string | null }
) => ({
  changeNote: value.changeNote ?? "",
  cookingTimeMinutes: asInputValue(value.cookingTimeMinutes),
  description: value.description ?? "",
  ingredients: value.ingredients.map((line) => ({
    displayName: line.displayName,
    note: line.note ?? "",
    quantityText: line.quantityText ?? "",
    quantityUnit: line.quantityUnit ?? "",
    quantityValue: asInputValue(line.quantityValue),
  })),
  servingsText: value.servingsText ?? "",
  source: {
    sourceName: value.source.sourceName ?? "",
    sourceType: value.source.sourceType,
    sourceUrl: value.source.sourceUrl ?? "",
  },
  steps: value.steps.map((step) => ({ body: step.body })),
  title: value.title,
});

const FieldMessages = ({
  errors,
  id,
}: {
  errors?: string[] | undefined;
  id: string;
}) =>
  errors !== undefined && errors.length > 0 ? (
    <p className={errorClass} id={id} role="alert">
      {errors.join("、")}
    </p>
  ) : null;

const RecipeTextField = ({
  field,
  inputType = "text",
  label,
  min,
  rows,
  step,
}: {
  field: FormField;
  inputType?: "number" | "text" | "url";
  label: string;
  min?: number;
  rows?: number;
  step?: string;
}) => (
  <TextField
    className={fieldClass}
    defaultValue={asInputValue(field.initialValue)}
    isInvalid={Boolean(field.errors?.length)}
    key={field.key}
    name={field.name}
    type={inputType}
  >
    <Label>{label}</Label>
    {rows === undefined ? (
      <Input className={inputClass} min={min} step={step} />
    ) : (
      <TextArea className={inputClass} rows={rows} />
    )}
    <FieldMessages errors={field.errors} id={field.errorId} />
  </TextField>
);

const getSubmitLabel = (
  mode: RecipeFormProps["mode"],
  isPending: boolean
): string => {
  if (isPending) {
    return "保存中…";
  }
  if (mode === "create") {
    return "レシピを作成";
  }
  return "新しい版を保存";
};

export const RecipeForm = ({
  conflictRecipeId,
  initialValue = defaultRecipe,
  isPending,
  mode,
  onSubmit: submitRecipe,
}: RecipeFormProps) => {
  const [form, fields] = useForm({
    defaultValue: toFormDefaultValue(initialValue),
    onSubmit(event) {
      event.preventDefault();
      const submission = parseWithValibot(new FormData(event.currentTarget), {
        schema: recipeFormSchema,
      });
      if (submission.status !== "success") {
        return;
      }
      const { changeNote, ...recipe } = submission.value;
      submitRecipe({ changeNote, recipe });
    },
    onValidate({ formData }) {
      return parseWithValibot(formData, { schema: recipeFormSchema });
    },
    shouldRevalidate: "onInput",
    shouldValidate: "onBlur",
  });
  const ingredientItems = fields.ingredients.getFieldList();
  const stepItems = fields.steps.getFieldList();
  const sourceFields = fields.source.getFieldset();

  return (
    <form {...getFormProps(form)} className={formClass} method="post">
      {conflictRecipeId !== undefined && conflictRecipeId.length > 0 ? (
        <div
          className={css({
            backgroundColor: "red.50",
            borderColor: "red.700",
            borderRadius: "md",
            borderWidth: "1px",
            p: "4",
          })}
          role="alert"
        >
          <p>編集中にレシピが更新された</p>
          <Link
            className={css({ textDecoration: "underline" })}
            params={{ recipeId: conflictRecipeId }}
            to="/recipes/$recipeId"
          >
            最新版を確認する
          </Link>
        </div>
      ) : null}

      <RecipeTextField field={fields.title} label="タイトル" />
      <RecipeTextField field={fields.description} label="説明" rows={4} />

      <div
        className={css({
          display: "grid",
          gap: "4",
          gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
        })}
      >
        <RecipeTextField field={fields.servingsText} label="分量" />
        <RecipeTextField
          field={fields.cookingTimeMinutes}
          inputType="number"
          label="調理時間（分）"
          min={0}
        />
      </div>

      <fieldset className={fieldClass}>
        <legend className={css({ fontSize: "lg", fontWeight: "semibold" })}>
          材料
        </legend>
        {ingredientItems.map((item, index) => {
          const ingredientFields = item.getFieldset();
          return (
            <div className={itemClass} key={item.key}>
              <RecipeTextField
                field={ingredientFields.displayName}
                label="材料名"
              />
              <div
                className={css({
                  display: "grid",
                  gap: "3",
                  gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
                })}
              >
                <RecipeTextField
                  field={ingredientFields.quantityValue}
                  inputType="number"
                  label="数量"
                  step="any"
                />
                <RecipeTextField
                  field={ingredientFields.quantityUnit}
                  label="単位"
                />
                <RecipeTextField
                  field={ingredientFields.quantityText}
                  label="分量の表記"
                />
              </div>
              <RecipeTextField field={ingredientFields.note} label="補足" />
              <Button
                className={buttonClass}
                onPress={() => {
                  form.remove({ index, name: fields.ingredients.name });
                }}
                type="button"
              >
                この材料を削除
              </Button>
            </div>
          );
        })}
        <Button
          className={buttonClass}
          onPress={() => {
            form.insert({
              defaultValue: {
                displayName: "",
                note: "",
                quantityText: "",
                quantityUnit: "",
                quantityValue: "",
              },
              name: fields.ingredients.name,
            });
          }}
          type="button"
        >
          材料を追加
        </Button>
      </fieldset>

      <fieldset className={fieldClass}>
        <legend className={css({ fontSize: "lg", fontWeight: "semibold" })}>
          手順
        </legend>
        {stepItems.map((item, index) => {
          const stepFields = item.getFieldset();
          return (
            <div className={itemClass} key={item.key}>
              <RecipeTextField
                field={stepFields.body}
                label={`手順 ${index + 1}`}
                rows={3}
              />
              <Button
                className={buttonClass}
                onPress={() => {
                  form.remove({ index, name: fields.steps.name });
                }}
                type="button"
              >
                この手順を削除
              </Button>
            </div>
          );
        })}
        <Button
          className={buttonClass}
          onPress={() => {
            form.insert({
              defaultValue: { body: "" },
              name: fields.steps.name,
            });
          }}
          type="button"
        >
          手順を追加
        </Button>
      </fieldset>

      {mode === "create" ? (
        <fieldset className={fieldClass}>
          <legend className={css({ fontSize: "lg", fontWeight: "semibold" })}>
            出典
          </legend>
          <label htmlFor={sourceFields.sourceType.id}>種類</label>
          <select
            {...getInputProps(sourceFields.sourceType, { type: "text" })}
            className={inputClass}
          >
            <option value="original">オリジナル</option>
            <option value="website">ウェブサイト</option>
            <option value="book">本</option>
            <option value="other">その他</option>
          </select>
          <RecipeTextField field={sourceFields.sourceName} label="出典名" />
          <RecipeTextField
            field={sourceFields.sourceUrl}
            inputType="url"
            label="出典URL"
          />
        </fieldset>
      ) : (
        <>
          <input
            {...getInputProps(sourceFields.sourceType, { type: "hidden" })}
          />
          <input
            {...getInputProps(sourceFields.sourceName, { type: "hidden" })}
          />
          <input
            {...getInputProps(sourceFields.sourceUrl, { type: "hidden" })}
          />
          <RecipeTextField
            field={fields.changeNote}
            label="変更メモ"
            rows={3}
          />
        </>
      )}

      {mode === "create" ? (
        <input {...getInputProps(fields.changeNote, { type: "hidden" })} />
      ) : null}
      <Button className={buttonClass} isDisabled={isPending} type="submit">
        {getSubmitLabel(mode, isPending)}
      </Button>
    </form>
  );
};
