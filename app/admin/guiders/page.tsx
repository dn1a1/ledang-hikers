'use client';

import React, { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

type Guider = {
  id: string;
  name: string;
  phone: string;
  age: number;
  photo_url?: string;
  experience?: string;
};

export default function GuiderManagementPage() {
  const [guiders, setGuiders] = useState<Guider[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [experience, setExperience] = useState('');

  // Load guider list
  useEffect(() => {
    fetchGuiders();
  }, []);

  const fetchGuiders = async () => {
    const { data } = await supabase
      .from('guiders')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setGuiders(data);
  };

  // Add guider
  const handleAddGuider = async () => {
    if (!name || !phone || !age) {
      alert('Please fill all required fields');
      return;
    }

    const { error } = await supabase.from('guiders').insert([
      {
        name,
        phone,
        age: Number(age),
        experience,
      },
    ]);

    if (error) {
      console.error(error);
      alert('Failed to add guider');
      return;
    }

    setName('');
    setPhone('');
    setAge('');
    setExperience('');
    fetchGuiders();
  };

  return (
    <div className="p-6 space-y-8">

      <h1 className="text-2xl font-bold flex items-center gap-2">
        <UserPlus className="h-6 w-6 text-primary" />
        Guider Management
      </h1>

      {/* ADD GUIDER FORM */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Add New Guider</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <Input
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Input
            type="number"
            placeholder="Age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />

          <Textarea
            placeholder="Experience / Notes"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
          />

          <Button
            className="md:col-span-2 rounded-xl"
            onClick={handleAddGuider}
          >
            Add Guider
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* GUIDER LIST */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Registered Guiders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {guiders.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No guider registered yet.
            </p>
          )}

          {guiders.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-4 p-4 border rounded-xl"
            >
              <Avatar>
                <AvatarImage src={g.photo_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {g.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <p className="font-medium">{g.name}</p>
                <p className="text-sm text-muted-foreground">
                  📞 {g.phone} · Age {g.age} years
                </p>
                {g.experience && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Experience : {g.experience}
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  );
}
